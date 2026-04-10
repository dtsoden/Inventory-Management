import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { AssetService } from '@/lib/inventory/AssetService';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';

class InventoryListHandler extends BaseApiHandler {
  private service = new AssetService(prisma);

  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const url = req.nextUrl;
    const pagination = this.getPagination(req);
    const sort = this.getSort(req, 'createdAt');

    const status = url.searchParams.get('status');
    const categoryId = url.searchParams.get('categoryId');
    const vendorId = url.searchParams.get('vendorId');
    const assignedTo = url.searchParams.get('assignedTo');
    const search = url.searchParams.get('search');
    const exportCsv = url.searchParams.get('export') === 'csv';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }
    if (categoryId) {
      where.item = { ...((where.item as object) ?? {}), categoryId };
    }
    if (vendorId) {
      where.item = { ...((where.item as object) ?? {}), vendorId };
    }

    if (exportCsv) {
      const csv = await this.service.exportCsv(ctx, where);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="assets.csv"',
        },
      });
    }

    if (search) {
      const result = await this.service.searchAssets(ctx, search, {
        pagination,
        sort,
        where,
      });
      return this.success(result);
    }

    const result = await this.service.list(ctx, { pagination, sort, where });
    return this.success(result);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const body = await req.json();
    const asset = await this.service.create(ctx, body);
    return this.success(asset, 201);
  }
}

const handler = new InventoryListHandler();

export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
