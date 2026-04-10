import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { itemService, itemRepository } from '@/lib/procurement';

class ItemsHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const pagination = this.getPagination(req);
    const sort = this.getSort(req, 'name');
    const search = req.nextUrl.searchParams.get('search');
    const vendorId = req.nextUrl.searchParams.get('vendorId');
    const categoryId = req.nextUrl.searchParams.get('categoryId');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (vendorId) where.vendorId = vendorId;
    if (categoryId) where.categoryId = categoryId;

    const result = await itemRepository.findAllWithRelations(ctx.tenantId, {
      pagination,
      sort,
      where,
    });
    return this.success(result);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const body = await req.json();
    const item = await itemService.create(ctx, body);
    return this.success(item, 201);
  }
}

const handler = new ItemsHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
