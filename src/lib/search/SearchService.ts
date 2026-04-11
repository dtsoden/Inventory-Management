import type { PrismaClient } from '@prisma/client';

/**
 * Cross-entity search service that powers the Cmd+K command palette.
 *
 * Owns its own prisma queries because the OR-across-fields filters
 * needed here don't fit the standard BaseRepository.findAll contract.
 * Lives in this dedicated service so route handlers stay free of
 * direct prisma calls.
 */

export interface SearchHit {
  type: 'vendor' | 'item' | 'order' | 'asset' | 'manufacturer';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const MAX_PER_TYPE = 5;

export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async crossEntitySearch(tenantId: string, query: string): Promise<SearchHit[]> {
    const q = query.trim();
    if (q.length === 0) return [];

    const [vendors, items, orders, assets, manufacturers] = await Promise.all([
      this.prisma.vendor.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: q } },
            { contactName: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: { id: true, name: true, contactName: true, email: true },
        take: MAX_PER_TYPE,
      }),
      this.prisma.item.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { manufacturerPartNumber: { contains: q } },
          ],
        },
        select: { id: true, name: true, sku: true },
        take: MAX_PER_TYPE,
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          OR: [
            { orderNumber: { contains: q } },
            { vendorName: { contains: q } },
          ],
        },
        select: { id: true, orderNumber: true, vendorName: true, status: true },
        take: MAX_PER_TYPE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.findMany({
        where: {
          tenantId,
          OR: [
            { assetTag: { contains: q } },
            { serialNumber: { contains: q } },
            { assignedTo: { contains: q } },
          ],
        },
        select: {
          id: true,
          assetTag: true,
          serialNumber: true,
          status: true,
          item: { select: { name: true } },
        },
        take: MAX_PER_TYPE,
      }),
      this.prisma.manufacturer.findMany({
        where: { tenantId, name: { contains: q } },
        select: { id: true, name: true },
        take: MAX_PER_TYPE,
      }),
    ]);

    return [
      ...vendors.map((v) => ({
        type: 'vendor' as const,
        id: v.id,
        title: v.name,
        subtitle:
          v.contactName || v.email
            ? [v.contactName, v.email].filter(Boolean).join(' · ')
            : undefined,
        href: `/vendors/${v.id}`,
      })),
      ...items.map((i) => ({
        type: 'item' as const,
        id: i.id,
        title: i.name,
        subtitle: i.sku ?? undefined,
        href: `/inventory/items/${i.id}`,
      })),
      ...orders.map((o) => ({
        type: 'order' as const,
        id: o.id,
        title: o.orderNumber,
        subtitle: `${o.vendorName ?? 'Unknown vendor'} · ${o.status}`,
        href: `/procurement/orders/${o.id}`,
      })),
      ...assets.map((a) => ({
        type: 'asset' as const,
        id: a.id,
        title: a.assetTag ?? a.serialNumber ?? 'Unnamed asset',
        subtitle: `${a.item?.name ?? ''} · ${a.status}`.trim().replace(/^· /, ''),
        href: `/inventory/${a.id}`,
      })),
      ...manufacturers.map((m) => ({
        type: 'manufacturer' as const,
        id: m.id,
        title: m.name,
        href: `/inventory/manufacturers`,
      })),
    ];
  }
}
