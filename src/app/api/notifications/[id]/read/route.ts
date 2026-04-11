import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { notificationService } from '@/lib/notifications';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('notifications') + 1];
}

class NotificationReadHandler extends BaseApiHandler {
  protected async onPatch(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    await notificationService.markRead(ctx, id);
    return this.success(null);
  }
}

const handler = new NotificationReadHandler();
export const PATCH = handler.handle('PATCH');
