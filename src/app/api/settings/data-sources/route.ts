import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { externalDataSourceService } from '@/lib/data-sources';

class DataSourcesHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const sources = await externalDataSourceService.listForCurrentTenant(ctx);
    return this.success(sources);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const data = await req.json();
    const created = await externalDataSourceService.createOne(ctx, data);
    return this.success(created, 201);
  }
}

const handler = new DataSourcesHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
