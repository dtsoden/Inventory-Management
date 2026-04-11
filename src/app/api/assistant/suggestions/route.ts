import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';

// Generates 4 quick-prompt suggestions for the AI assistant chat panel,
// using REAL entity names from the tenant's data so suggestions match
// the kind of inventory the user actually buys (laptops in IT, axles in
// auto manufacturing, etc.). Falls back to generic prompts if the
// tenant has no data yet.

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

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    // Pull a small sample of real entities to template into the suggestions.
    const [topVendor, lowStockItem, pendingOrder, topCategory] = await Promise.all([
      // The vendor with the most items
      prisma.vendor
        .findFirst({
          where: { tenantId: ctx.tenantId, isActive: true },
          orderBy: { items: { _count: 'desc' } },
          select: { name: true },
        })
        .catch(() => null),

      // An item that is at or below its reorder point
      prisma.item
        .findFirst({
          where: {
            tenantId: ctx.tenantId,
            isActive: true,
            reorderPoint: { gt: 0 },
          },
          select: { name: true },
        })
        .catch(() => null),

      // A purchase order currently awaiting approval
      prisma.purchaseOrder
        .findFirst({
          where: { tenantId: ctx.tenantId, status: 'PENDING_APPROVAL' },
          orderBy: { createdAt: 'desc' },
          select: { orderNumber: true },
        })
        .catch(() => null),

      // The most populated item category
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

    // Always finish with at least 4 suggestions, padding from the generic list.
    for (const fallback of GENERIC_FALLBACKS) {
      if (suggestions.length >= 4) break;
      if (!suggestions.find((s) => s.label === fallback.label)) {
        suggestions.push(fallback);
      }
    }

    return NextResponse.json(
      { success: true, data: suggestions.slice(0, 4) },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/assistant/suggestions error:', error);
    return NextResponse.json(
      { success: true, data: GENERIC_FALLBACKS },
    );
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '...';
}
