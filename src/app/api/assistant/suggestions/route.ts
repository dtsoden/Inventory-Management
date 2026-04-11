import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';

interface Suggestion {
  label: string;
  prompt: string;
}

const GENERIC_FALLBACKS: Suggestion[] = [
  { label: 'Show pending orders', prompt: 'Show me all purchase orders in PENDING_APPROVAL status.' },
  { label: 'What needs reordering?', prompt: 'Which items are at or below their reorder point?' },
  { label: 'Vendor summary', prompt: 'Give me a summary of our active vendors and how many items they supply.' },
  { label: 'Recent activity', prompt: 'What were the last 10 changes to our inventory and purchase orders?' },
];

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '...';
}

class SuggestionsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const [topVendor, lowStockItem, pendingOrder, topCategory] = await Promise.all([
      prisma.vendor
        .findFirst({
          where: { tenantId: ctx.tenantId, isActive: true },
          orderBy: { items: { _count: 'desc' } },
          select: { name: true },
        })
        .catch(() => null),
      prisma.item
        .findFirst({
          where: { tenantId: ctx.tenantId, isActive: true, reorderPoint: { gt: 0 } },
          select: { name: true },
        })
        .catch(() => null),
      prisma.purchaseOrder
        .findFirst({
          where: { tenantId: ctx.tenantId, status: 'PENDING_APPROVAL' },
          orderBy: { createdAt: 'desc' },
          select: { orderNumber: true },
        })
        .catch(() => null),
      prisma.itemCategory
        .findFirst({
          where: { tenantId: ctx.tenantId },
          orderBy: { items: { _count: 'desc' } },
          select: { name: true },
        })
        .catch(() => null),
    ]);

    const suggestions: Suggestion[] = [];

    if (topVendor?.name) {
      suggestions.push({
        label: `Items from ${topVendor.name}`,
        prompt: `Show me all items we buy from ${topVendor.name}, with their current stock levels.`,
      });
    }
    if (lowStockItem?.name) {
      suggestions.push({
        label: `Stock of ${truncate(lowStockItem.name, 28)}`,
        prompt: `What is the current stock and reorder status of ${lowStockItem.name}?`,
      });
    }
    if (pendingOrder?.orderNumber) {
      suggestions.push({
        label: `Status of ${pendingOrder.orderNumber}`,
        prompt: `Give me the full status, line items, and approval state of purchase order ${pendingOrder.orderNumber}.`,
      });
    } else {
      suggestions.push({
        label: 'Show pending orders',
        prompt: 'Show me all purchase orders in PENDING_APPROVAL status.',
      });
    }
    if (topCategory?.name) {
      suggestions.push({
        label: `${topCategory.name} stock summary`,
        prompt: `Summarize the current stock and recent purchases for everything in the ${topCategory.name} category.`,
      });
    }

    for (const fallback of GENERIC_FALLBACKS) {
      if (suggestions.length >= 4) break;
      if (!suggestions.find((s) => s.label === fallback.label)) {
        suggestions.push(fallback);
      }
    }

    return this.success(suggestions.slice(0, 4));
  }
}

const handler = new SuggestionsHandler();
export const GET = handler.handle('GET');
