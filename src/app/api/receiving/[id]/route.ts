import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';

class ReceivingDetailHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const session = await receivingService.getByIdOrThrow(ctx, id);

    const { prisma } = await import('@/lib/db');
    const assets = await prisma.asset.findMany({
      where: {
        tenantId: ctx.tenantId,
        receivingSessionId: id,
      },
      select: {
        assetTag: true,
        serialNumber: true,
        item: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const taggedAssets = assets.map((a) => ({
      itemName: a.item?.name ?? 'Unknown',
      assetTag: a.assetTag ?? '',
      serialNumber: a.serialNumber ?? undefined,
    }));

    const response = {
      ...session,
      aiExtractionData: (session as any).aiExtractionData
        ? JSON.parse((session as any).aiExtractionData)
        : null,
      taggedAssets,
    };

    return this.success(response);
  }
}

const handler = new ReceivingDetailHandler();
export const GET = handler.handle('GET');
