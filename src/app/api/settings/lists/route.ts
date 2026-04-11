import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';

const DEFAULT_ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST'];
const DEFAULT_ORDER_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

const systemConfigRepo = new SystemConfigRepository(prisma);

class ListsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const customAssetConfig = await systemConfigRepo.findByKey('custom_asset_statuses');
    const customOrderConfig = await systemConfigRepo.findByKey('custom_order_statuses');

    const customAssetStatuses: string[] = customAssetConfig?.value
      ? JSON.parse(customAssetConfig.value)
      : [];
    const customOrderStatuses: string[] = customOrderConfig?.value
      ? JSON.parse(customOrderConfig.value)
      : [];

    return this.success({
      assetStatuses: { defaults: DEFAULT_ASSET_STATUSES, custom: customAssetStatuses },
      orderStatuses: { defaults: DEFAULT_ORDER_STATUSES, custom: customOrderStatuses },
    });
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const { listType, customValues } = await req.json();
    if (!listType || !Array.isArray(customValues)) {
      throw new ValidationError('listType and customValues array required');
    }

    let configKey: string;
    let defaults: string[];
    if (listType === 'asset') {
      configKey = 'custom_asset_statuses';
      defaults = DEFAULT_ASSET_STATUSES;
    } else if (listType === 'order') {
      configKey = 'custom_order_statuses';
      defaults = DEFAULT_ORDER_STATUSES;
    } else {
      throw new ValidationError('Invalid listType. Must be "asset" or "order".');
    }

    const upperValues = customValues.map((v: string) => v.toUpperCase().trim());
    const duplicates = upperValues.filter((v: string) => defaults.includes(v));
    if (duplicates.length > 0) {
      throw new ValidationError(
        `These values are already built-in defaults: ${duplicates.join(', ')}`,
      );
    }

    await systemConfigRepo.upsert({
      key: configKey,
      value: JSON.stringify(upperValues),
      isSecret: false,
      category: 'platform',
      description: `Custom ${listType} statuses`,
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

    return this.success(null);
  }
}

const handler = new ListsHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
