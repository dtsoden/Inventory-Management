import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { notificationPreferenceService } from '@/lib/notifications';

class NotificationPrefsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    return this.success(await notificationPreferenceService.getForUser(ctx.userId));
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json();
    return this.success(await notificationPreferenceService.saveForUser(ctx.userId, body));
  }
}

const handler = new NotificationPrefsHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
