import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { itemService, itemRepository } from '@/lib/procurement';

class ItemHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const item = await itemRepository.findByIdWithRelations(ctx.tenantId, id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }
    return this.success(item);
  }

  protected async onPut(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const body = await req.json();
    const item = await itemService.update(ctx, id, body);
    return this.success(item);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    await itemService.delete(ctx, id);
    return this.successMessage('Item deleted');
  }
}

const handler = new ItemHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
