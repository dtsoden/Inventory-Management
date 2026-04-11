import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { syncFromSource } from '@/lib/integrations/data-source-service';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('data-sources') + 1];
}

class SyncHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const result = await syncFromSource(ctx.tenantId, id);
    return this.success(result);
  }
}

const handler = new SyncHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
