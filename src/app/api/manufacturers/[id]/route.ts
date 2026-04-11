import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { manufacturerService } from '@/lib/manufacturers';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('manufacturers') + 1];
}

class ManufacturerHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const mfg = await manufacturerService.getByIdWithItems(ctx, id);
    return this.success(mfg);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const data = await req.json();
    const updated = await manufacturerService.updateOne(ctx, id, data);
    return this.success(updated);
  }

  protected async onDelete(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    await manufacturerService.deactivate(ctx, id);
    return this.successMessage('Manufacturer deactivated');
  }
}

const handler = new ManufacturerHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
