import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { externalDataSourceService } from '@/lib/data-sources';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('data-sources') + 1];
}

class DataSourceHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const source = await externalDataSourceService.getOne(ctx, id);
    return this.success(source);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const data = await req.json();
    const updated = await externalDataSourceService.updateOne(ctx, id, data);
    return this.success(updated);
  }

  protected async onDelete(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    await externalDataSourceService.deleteOne(ctx, id);
    return this.success(null);
  }
}

const handler = new DataSourceHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
export const DELETE = handler.handle('DELETE', { requiredRoles: [UserRole.ADMIN] });
