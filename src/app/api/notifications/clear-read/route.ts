import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { notificationService } from '@/lib/notifications';

class ClearReadHandler extends BaseApiHandler {
  protected async onPost(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const deleted = await notificationService.clearRead(ctx);
    return this.success({ deleted });
  }
}

const handler = new ClearReadHandler();
export const POST = handler.handle('POST');
