import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { receivingService } from '@/lib/receiving';

class CompleteHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const idIndex = segments.indexOf('receiving') + 1;
    const sessionId = segments[idIndex];

    const session = await receivingService.completeSession(ctx, sessionId);
    return this.success(session);
  }
}

const handler = new CompleteHandler();
export const POST = handler.handle('POST');
