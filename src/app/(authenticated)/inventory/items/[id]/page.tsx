'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Factory,
  Building2,
  Tag,
  AlertTriangle,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface StockCounts {
  total: number;
  available: number;
  assigned: number;
  inMaintenance: number;
  retired: number;
  lost: number;
}

interface ItemDetail {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  manufacturerPartNumber: string | null;
  unitCost: number | null;
  reorderPoint: number;
  reorderQuantity: number;
  imageUrl: string | null;
  stock: StockCounts;
  isLowStock: boolean;
  manufacturer: {
    id: string;
    name: string;
    website: string | null;
    supportUrl: string | null;
    supportPhone: string | null;
    supportEmail: string | null;
  } | null;
  vendor: { id: string; name: string; website: string | null } | null;
  category: { id: string; name: string } | null;
  assets: Array<{
    id: string;
    assetTag: string | null;
    serialNumber: string | null;
    status: string;
    location: string | null;
    assignedTo: string | null;
    purchasedAt: string | null;
    purchaseOrderLine: {
      id: string;
      purchaseOrder: { id: string; orderNumber: string; vendorName: string | null };
    } | null;
  }>;
  purchaseOrderLines: Array<{
    id: string;
    quantity: number;
    unitCost: number;
    receivedQty: number;
    createdAt: string;
    purchaseOrder: {
      id: string;
      orderNumber: string;
      vendorName: string | null;
      status: string;
      orderedAt: string | null;
    };
  }>;
  knownVendors: Array<{ name: string; lastOrderedAt: string | null }>;
}

type Tab = 'assets' | 'history' | 'where-to-buy';

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(val: number | null): string {
  if (val == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
}

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('assets');

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/inventory/items/${id}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItem(json.data);
    } catch {
      router.push('/inventory');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  if (loading) {
    return (
      <div>
        <div className="page-header flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/inventory')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Package className="h-7 w-7 text-primary" />
          <div>
            <h1 className="page-title">{item.name}</h1>
            <p className="text-sm text-muted-foreground">
              {item.sku && <span className="font-mono">{item.sku}</span>}
              {item.category && <span> | {item.category.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.isLowStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              LOW STOCK
            </span>
          )}
          <Button
            size="sm"
            className="bg-brand-green hover:bg-brand-green/90"
            onClick={() => router.push(`/procurement/new?itemId=${item.id}${item.vendor ? `&vendorName=${encodeURIComponent(item.vendor.name)}` : ''}`)}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Reorder
          </Button>
        </div>
      </div>

      {/* Stock summary cards */}
      <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StockCard label="Total" value={item.stock.total} />
        <StockCard
          label="Available"
          value={item.stock.available}
          highlight={item.isLowStock ? 'danger' : 'success'}
        />
        <StockCard label="Assigned" value={item.stock.assigned} />
        <StockCard label="In Maintenance" value={item.stock.inMaintenance} />
        <StockCard label="Retired" value={item.stock.retired} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main content: catalog info + tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-base rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Catalog Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Product Name" value={item.name} />
              <InfoRow label="SKU" value={item.sku} mono />
              <InfoRow
                label="Manufacturer"
                value={item.manufacturer?.name ?? null}
              />
              <InfoRow
                label="Manufacturer Part #"
                value={item.manufacturerPartNumber}
                mono
              />
              <InfoRow label="Default Vendor" value={item.vendor?.name ?? null} />
              <InfoRow label="Category" value={item.category?.name ?? null} />
              <InfoRow label="Unit Cost" value={formatMoney(item.unitCost)} />
              <InfoRow
                label="Reorder Point / Qty"
                value={`${item.reorderPoint} / ${item.reorderQuantity}`}
              />
              {item.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="card-base rounded-xl overflow-hidden">
            <div className="border-b flex">
              <TabButton active={tab === 'assets'} onClick={() => setTab('assets')}>
                Individual Assets ({item.assets.length})
              </TabButton>
              <TabButton
                active={tab === 'history'}
                onClick={() => setTab('history')}
              >
                Purchase History ({item.purchaseOrderLines.length})
              </TabButton>
              <TabButton
                active={tab === 'where-to-buy'}
                onClick={() => setTab('where-to-buy')}
              >
                Where to Buy
              </TabButton>
            </div>

            <div className="p-4">
              {tab === 'assets' && <AssetsTab item={item} router={router} />}
              {tab === 'history' && <HistoryTab item={item} router={router} />}
              {tab === 'where-to-buy' && <WhereToBuyTab item={item} />}
            </div>
          </div>
        </div>

        {/* Sidebar: manufacturer support */}
        <div className="space-y-6">
          {item.manufacturer && (
            <div className="card-base rounded-xl p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Manufacturer Support
              </h3>
              <p className="text-base font-medium mb-3">{item.manufacturer.name}</p>
              <div className="space-y-2 text-sm">
                {item.manufacturer.website && (
                  <a
                    href={item.manufacturer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-green hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {item.manufacturer.supportUrl && (
                  <a
                    href={item.manufacturer.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-green hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Support Portal
                  </a>
                )}
                {item.manufacturer.supportPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {item.manufacturer.supportPhone}
                  </div>
                )}
                {item.manufacturer.supportEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {item.manufacturer.supportEmail}
                  </div>
                )}
              </div>
            </div>
          )}

          {item.vendor && (
            <div className="card-base rounded-xl p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Default Vendor
              </h3>
              <p className="text-base font-medium">{item.vendor.name}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => router.push(`/vendors/${item.vendor!.id}`)}
              >
                View Vendor
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StockCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'success' | 'danger';
}) {
  const color =
    highlight === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : highlight === 'success'
        ? 'text-green-600 dark:text-green-400'
        : '';
  return (
    <div className="card-base rounded-xl p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || '-'}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-brand-green text-brand-green'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function AssetsTab({
  item,
  router,
}: {
  item: ItemDetail;
  router: ReturnType<typeof useRouter>;
}) {
  if (item.assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No assets have been created for this item yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Asset Tag
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Serial
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Location
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assigned To
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PO
            </th>
          </tr>
        </thead>
        <tbody>
          {item.assets.map((a) => (
            <tr
              key={a.id}
              className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
              onClick={() => router.push(`/inventory/${a.id}`)}
            >
              <td className="px-3 py-2 font-medium">{a.assetTag || '-'}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {a.serialNumber || '-'}
              </td>
              <td className="px-3 py-2 text-xs">{a.status}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {a.location || '-'}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {a.assignedTo || '-'}
              </td>
              <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                {a.purchaseOrderLine?.purchaseOrder.orderNumber || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({
  item,
  router,
}: {
  item: ItemDetail;
  router: ReturnType<typeof useRouter>;
}) {
  if (item.purchaseOrderLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No purchase history recorded for this item.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PO Number
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vendor
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Qty
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Received
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unit Cost
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ordered
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {item.purchaseOrderLines.map((l) => (
            <tr
              key={l.id}
              className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
              onClick={() => router.push(`/procurement/${l.purchaseOrder.id}`)}
            >
              <td className="px-3 py-2 font-mono text-xs font-medium">
                {l.purchaseOrder.orderNumber}
              </td>
              <td className="px-3 py-2">{l.purchaseOrder.vendorName || '-'}</td>
              <td className="px-3 py-2 text-right">{l.quantity}</td>
              <td className="px-3 py-2 text-right">{l.receivedQty}</td>
              <td className="px-3 py-2 text-right">{formatMoney(l.unitCost)}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatDate(l.purchaseOrder.orderedAt)}
              </td>
              <td className="px-3 py-2 text-xs">{l.purchaseOrder.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WhereToBuyTab({ item }: { item: ItemDetail }) {
  return (
    <div className="space-y-6">
      {item.manufacturer && (
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Factory className="h-4 w-4 text-muted-foreground" />
            Manufacturer
          </h4>
          <div className="rounded-lg border p-4">
            <p className="font-medium">{item.manufacturer.name}</p>
            {item.manufacturerPartNumber && (
              <p className="text-xs text-muted-foreground font-mono mt-1">
                MPN: {item.manufacturerPartNumber}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {item.manufacturer.website && (
                <a
                  href={item.manufacturer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-green hover:underline inline-flex items-center gap-1"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
              {item.manufacturer.supportUrl && (
                <a
                  href={item.manufacturer.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-green hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Support
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Known Vendors
        </h4>
        {item.knownVendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No purchase history with any vendor yet.
          </p>
        ) : (
          <div className="space-y-2">
            {item.knownVendors.map((v, idx) => (
              <div
                key={idx}
                className="rounded-lg border p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{v.name}</p>
                  {v.lastOrderedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last ordered {formatDate(v.lastOrderedAt)}
                    </p>
                  )}
                </div>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
