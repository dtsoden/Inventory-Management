import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { manufacturerService } from '@/lib/manufacturers';

class ManufacturersHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const url = req.nextUrl;
    const result = await manufacturerService.listWithCounts(ctx, {
      page: parseInt(url.searchParams.get('page') ?? '1', 10),
      pageSize: parseInt(url.searchParams.get('pageSize') ?? '50', 10),
      search: url.searchParams.get('search') ?? undefined,
      activeOnly: url.searchParams.get('activeOnly') !== 'false',
    });
    return this.success(result);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const data = await req.json();
    const created = await manufacturerService.createOne(ctx, data);
    return this.success(created, 201);
  }
}

const handler = new ManufacturersHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
