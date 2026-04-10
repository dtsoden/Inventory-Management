import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { AssetRepository, AssetRecord } from './AssetRepository';
import { TenantContext, AssetStatus, PaginatedResult } from '@/lib/types';
import { FindAllOptions } from '@/lib/base/BaseRepository';
import { NotFoundError, ValidationError } from '@/lib/errors';

export class AssetService extends BaseService<AssetRecord> {
  private readonly assetRepo: AssetRepository;

  constructor(prisma: PrismaClient) {
    const repo = new AssetRepository(prisma);
    super(repo, prisma);
    this.assetRepo = repo;
  }

  protected get entityName(): string {
    return 'Asset';
  }

  async list(
    ctx: TenantContext,
    options?: FindAllOptions
  ): Promise<PaginatedResult<AssetRecord>> {
    return this.assetRepo.findAll(ctx.tenantId, options);
  }

  async getById(ctx: TenantContext, id: string): Promise<AssetRecord | null> {
    return this.assetRepo.findById(ctx.tenantId, id);
  }

  async getByIdOrThrow(ctx: TenantContext, id: string): Promise<AssetRecord> {
    const asset = await this.assetRepo.findById(ctx.tenantId, id);
    if (!asset) {
      throw new NotFoundError('Asset', id);
    }
    return asset;
  }

  async create(
    ctx: TenantContext,
    data: Record<string, unknown>
  ): Promise<AssetRecord> {
    const asset = await this.assetRepo.create(ctx.tenantId, data);
    const full = await this.assetRepo.findById(ctx.tenantId, (asset as any).id);
    await this.logAudit(ctx, 'CREATE', (asset as any).id, { data });
    return full ?? asset;
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: Record<string, unknown>
  ): Promise<AssetRecord> {
    const before = await this.getByIdOrThrow(ctx, id);
    await this.assetRepo.update(ctx.tenantId, id, data);
    const after = await this.assetRepo.findById(ctx.tenantId, id);
    await this.logAudit(ctx, 'UPDATE', id, { before, after });
    return after!;
  }

  async delete(ctx: TenantContext, id: string): Promise<AssetRecord> {
    await this.getByIdOrThrow(ctx, id);
    const deleted = await this.assetRepo.hardDelete(ctx.tenantId, id);
    await this.logAudit(ctx, 'DELETE', id);
    return deleted;
  }

  async assignAsset(
    ctx: TenantContext,
    assetId: string,
    userId: string
  ): Promise<AssetRecord> {
    const asset = await this.getByIdOrThrow(ctx, assetId);

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.LOST) {
      throw new ValidationError(
        `Cannot assign an asset with status "${asset.status}"`,
        { status: 'Asset must be available or in maintenance to assign' }
      );
    }

    const updated = await this.update(ctx, assetId, {
      assignedTo: userId,
      status: AssetStatus.ASSIGNED,
    });

    await this.logAudit(ctx, 'ASSIGN', assetId, {
      assignedTo: userId,
      previousStatus: asset.status,
    });

    return updated;
  }

  async unassignAsset(
    ctx: TenantContext,
    assetId: string
  ): Promise<AssetRecord> {
    const asset = await this.getByIdOrThrow(ctx, assetId);

    if (!asset.assignedTo) {
      throw new ValidationError('Asset is not currently assigned', {
        assignedTo: 'No assignee to remove',
      });
    }

    const updated = await this.update(ctx, assetId, {
      assignedTo: null,
      status: AssetStatus.AVAILABLE,
    });

    await this.logAudit(ctx, 'UNASSIGN', assetId, {
      previousAssignee: asset.assignedTo,
    });

    return updated;
  }

  async changeStatus(
    ctx: TenantContext,
    assetId: string,
    newStatus: string
  ): Promise<AssetRecord> {
    const validStatuses = Object.values(AssetStatus);
    if (!validStatuses.includes(newStatus as AssetStatus)) {
      throw new ValidationError(`Invalid status: "${newStatus}"`, {
        status: `Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const asset = await this.getByIdOrThrow(ctx, assetId);
    const previousStatus = asset.status;

    const updateData: Record<string, unknown> = { status: newStatus };

    // If changing to a non-assigned status, clear assignee
    if (
      newStatus !== AssetStatus.ASSIGNED &&
      asset.assignedTo
    ) {
      updateData.assignedTo = null;
    }

    const updated = await this.update(ctx, assetId, updateData);

    await this.logAudit(ctx, 'STATUS_CHANGE', assetId, {
      previousStatus,
      newStatus,
    });

    return updated;
  }

  async searchAssets(
    ctx: TenantContext,
    query: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<AssetRecord>> {
    return this.assetRepo.search(ctx.tenantId, query, options);
  }

  async getAuditHistory(
    ctx: TenantContext,
    assetId: string
  ): Promise<unknown[]> {
    return (this.prisma as any).auditLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        entity: 'Asset',
        entityId: assetId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async exportCsv(
    ctx: TenantContext,
    where?: Record<string, unknown>
  ): Promise<string> {
    const result = await this.assetRepo.findAll(ctx.tenantId, {
      where,
      pagination: { page: 1, pageSize: 10000 },
    });

    const headers = [
      'Asset Tag',
      'Item Name',
      'SKU',
      'Serial Number',
      'Status',
      'Assigned To',
      'Location',
      'Category',
      'Vendor',
      'Condition',
      'Notes',
      'Created At',
    ];

    const rows = result.data.map((a) => [
      a.assetTag ?? '',
      a.item?.name ?? '',
      a.item?.sku ?? '',
      a.serialNumber ?? '',
      a.status,
      a.assignedTo ?? '',
      a.location ?? '',
      a.item?.category?.name ?? '',
      a.item?.vendor?.name ?? '',
      a.condition ?? '',
      a.notes ?? '',
      a.createdAt.toISOString(),
    ]);

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ];

    return csvLines.join('\n');
  }
}
