import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { logStore } from '@/lib/logging/LogStore';
import { parseLogQuery } from '@/lib/logging/parse-log-query';

/** GET ?level=error,warn&q=text&source=openai&from=ISO&to=ISO&limit=&offset= */
class LogsHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const page = await logStore.query(parseLogQuery(req.nextUrl.searchParams));
    return this.success({ ...page, directory: 'data/logs' });
  }
}

const handler = new LogsHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
