import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { logStore, type LogEntry } from '@/lib/logging/LogStore';
import { parseLogQuery } from '@/lib/logging/parse-log-query';

/** Same filters as GET /api/settings/logs, plus format=csv|json. */
class LogsExportHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const params = req.nextUrl.searchParams;
    const entries = await logStore.collect(parseLogQuery(params));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (params.get('format') === 'json') {
      return new NextResponse(JSON.stringify(entries, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="logs-${stamp}.json"`,
        },
      });
    }
    return new NextResponse(toCsv(entries), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs-${stamp}.csv"`,
      },
    });
  }
}

function toCsv(entries: LogEntry[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = entries.map((e) => [e.ts, e.level, e.source, e.message].map(cell).join(','));
  return ['timestamp,level,source,message', ...rows].join('\r\n') + '\r\n';
}

const handler = new LogsExportHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
