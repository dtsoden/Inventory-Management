import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';

class TagHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const idIndex = segments.indexOf('receiving') + 1;
    const sessionId = segments[idIndex];

    const body = await req.json();
    const { itemId, assetTag, serialNumber } = body;

    if (!itemId || !assetTag) {
      return NextResponse.json(
        { success: false, error: 'itemId and assetTag are required' },
        { status: 400 }
      );
    }

    const asset = await receivingService.tagAsset(ctx, sessionId, {
      itemId,
      assetTag,
      serialNumber,
    });

    return this.success(asset, 201);
  }
}

const handler = new TagHandler();
export const POST = handler.handle('POST');
