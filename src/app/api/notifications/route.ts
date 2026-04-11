import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { notificationService } from '@/lib/notifications';

class NotificationsHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const url = req.nextUrl;
    const result = await notificationService.listForCurrentUser(ctx, {
      page: parseInt(url.searchParams.get('page') ?? '1', 10),
      pageSize: parseInt(url.searchParams.get('pageSize') ?? '20', 10),
      unreadOnly: url.searchParams.get('unreadOnly') === 'true',
    });
    return this.success(result);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const data = await req.json();
    const created = await notificationService.createForUser(ctx, data);
    return this.success(created, 201);
  }
}

const handler = new NotificationsHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
