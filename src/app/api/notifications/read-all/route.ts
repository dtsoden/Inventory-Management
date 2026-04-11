import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { notificationService } from '@/lib/notifications';

class ReadAllHandler extends BaseApiHandler {
  protected async onPatch(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const count = await notificationService.markAllRead(ctx);
    return this.success({ marked: count });
  }
}

const handler = new ReadAllHandler();
export const PATCH = handler.handle('PATCH');
