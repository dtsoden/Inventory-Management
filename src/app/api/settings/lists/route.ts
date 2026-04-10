import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';

const DEFAULT_ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'];
const DEFAULT_ORDER_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export async function GET() {
  try {
    await requireTenantContext();

    const customAssetConfig = await prisma.systemConfig.findUnique({
      where: { key: 'custom_asset_statuses' },
    });
    const customOrderConfig = await prisma.systemConfig.findUnique({
      where: { key: 'custom_order_statuses' },
    });

    const customAssetStatuses: string[] = customAssetConfig?.value
      ? JSON.parse(customAssetConfig.value)
      : [];
    const customOrderStatuses: string[] = customOrderConfig?.value
      ? JSON.parse(customOrderConfig.value)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        assetStatuses: {
          defaults: DEFAULT_ASSET_STATUSES,
          custom: customAssetStatuses,
        },
        orderStatuses: {
          defaults: DEFAULT_ORDER_STATUSES,
          custom: customOrderStatuses,
        },
      },
    });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error in GET /api/settings/lists:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can update status lists');
    }

    const { listType, customValues } = await req.json();

    if (!listType || !Array.isArray(customValues)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: listType and customValues array required' },
        { status: 400 }
      );
    }

    let configKey: string;
    if (listType === 'asset') {
      configKey = 'custom_asset_statuses';
    } else if (listType === 'order') {
      configKey = 'custom_order_statuses';
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid listType. Must be "asset" or "order".' },
        { status: 400 }
      );
    }

    // Validate: custom values must not duplicate defaults
    const defaults = listType === 'asset' ? DEFAULT_ASSET_STATUSES : DEFAULT_ORDER_STATUSES;
    const upperValues = customValues.map((v: string) => v.toUpperCase().trim());
    const duplicates = upperValues.filter((v: string) => defaults.includes(v));
    if (duplicates.length > 0) {
      return NextResponse.json(
        { success: false, error: `These values are already built-in defaults: ${duplicates.join(', ')}` },
        { status: 400 }
      );
    }

    await prisma.systemConfig.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(upperValues),
        category: 'platform',
        description: `Custom ${listType} statuses`,
      },
      update: { value: JSON.stringify(upperValues) },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'Settings',
        details: `Updated custom ${listType} statuses: ${upperValues.join(', ')}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error in PUT /api/settings/lists:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
