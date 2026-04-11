import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { itemCategoryService } from '@/lib/categories';
import { ForbiddenError } from '@/lib/errors';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('categories') + 1];
}

function requireManager(ctx: TenantContext): void {
  if (ctx.role !== UserRole.ADMIN && ctx.role !== UserRole.MANAGER) {
    throw new ForbiddenError('Only admins or managers can modify categories');
  }
}

class CategoryHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const cat = await itemCategoryService.getOne(ctx, id);
    return this.success(cat);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    requireManager(ctx);
    const id = parseId(req);
    const data = await req.json();
    const updated = await itemCategoryService.updateOne(ctx, id, data);
    return this.success(updated);
  }

  protected async onDelete(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    requireManager(ctx);
    const id = parseId(req);
    await itemCategoryService.deleteOne(ctx, id);
    return this.successMessage('Category deleted');
  }
}

const handler = new CategoryHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
