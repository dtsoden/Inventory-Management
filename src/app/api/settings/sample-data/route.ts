import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import {
  getSampleDataStatus,
  insertSampleData,
  removeSampleData,
} from '@/lib/seed/sample-data';

// GET /api/settings/sample-data - Check if sample data is loaded
export async function GET() {
  try {
    const ctx = await requireTenantContext();
    const status = await getSampleDataStatus(prisma, ctx.tenantId);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Failed to check sample data status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check sample data status.' },
      { status: 500 }
    );
  }
}

// POST /api/settings/sample-data - Insert sample data
export async function POST() {
  try {
    const ctx = await requireTenantContext();
    const ids = await insertSampleData(prisma, ctx.tenantId, ctx.userId);

    const counts = {
      vendors: ids.vendors.length,
      items: ids.items.length,
      categories: ids.categories.length,
      orders: ids.purchaseOrders.length,
      assets: ids.assets.length,
    };

    return NextResponse.json({ success: true, data: { counts } }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to insert sample data.';
    console.error('Failed to insert sample data:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/settings/sample-data - Remove sample data
export async function DELETE() {
  try {
    const ctx = await requireTenantContext();
    await removeSampleData(prisma, ctx.tenantId);
    return NextResponse.json({ success: true, message: 'Sample data removed.' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove sample data.';
    console.error('Failed to remove sample data:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
