import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { AssetService } from '@/lib/inventory/AssetService';
import { prisma } from '@/lib/db';
import { TenantContext } from '@/lib/types';

class AssetStatusHandler extends BaseApiHandler {
  private service = new AssetService(prisma);

  private getId(req: NextRequest): string {
    const segments = req.nextUrl.pathname.split('/');
    // /api/inventory/[id]/status => id is at index -2
    return segments[segments.length - 2];
  }

  protected async onPatch(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = this.getId(req);
    const { status } = await req.json();
    const asset = await this.service.changeStatus(ctx, id, status);
    return this.success(asset);
  }
}

const handler = new AssetStatusHandler();

export const PATCH = handler.handle('PATCH');
