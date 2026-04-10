import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { AssetService } from '@/lib/inventory/AssetService';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';

class InventoryDetailHandler extends BaseApiHandler {
  private service = new AssetService(prisma);

  private getId(req: NextRequest): string {
    const segments = req.nextUrl.pathname.split('/');
    // /api/inventory/[id] => id is the last segment
    return segments[segments.length - 1];
  }

  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    const asset = await this.service.getByIdOrThrow(ctx, id);
    return this.success(asset);
  }

  protected async onPut(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    const body = await req.json();
    const asset = await this.service.update(ctx, id, body);
    return this.success(asset);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    await this.service.delete(ctx, id);
    return this.successMessage('Asset deleted successfully');
  }
}

const handler = new InventoryDetailHandler();

export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
