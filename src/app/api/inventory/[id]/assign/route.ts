import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { AssetService } from '@/lib/inventory/AssetService';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';

class AssetAssignHandler extends BaseApiHandler {
  private service = new AssetService(prisma);

  private getId(req: NextRequest): string {
    const segments = req.nextUrl.pathname.split('/');
    // /api/inventory/[id]/assign => id is at index -2
    return segments[segments.length - 2];
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    const { userId } = await req.json();
    const asset = await this.service.assignAsset(ctx, id, userId);
    return this.success(asset);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    const asset = await this.service.unassignAsset(ctx, id);
    return this.success(asset);
  }
}

const handler = new AssetAssignHandler();

export const POST = handler.handle('POST');
export const DELETE = handler.handle('DELETE');
