import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { itemCategoryService } from '@/lib/categories';
import { ForbiddenError } from '@/lib/errors';

class CategoriesHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const cats = await itemCategoryService.listAll(ctx);
    const data = cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      itemCount: c._count.items,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return this.success(data);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    if (ctx.role !== UserRole.ADMIN && ctx.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only admins or managers can create categories');
    }
    const data = await req.json();
    const created = await itemCategoryService.createOne(ctx, data);
    return this.success(created, 201);
  }
}

const handler = new CategoriesHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
