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

    // Parse aiExtractionData if present
    const response = {
      ...session,
      aiExtractionData: session.aiExtractionData
        ? JSON.parse(session.aiExtractionData)
        : null,
    };

    return this.success(response);
  }
}

const handler = new ReceivingDetailHandler();
export const GET = handler.handle('GET');
