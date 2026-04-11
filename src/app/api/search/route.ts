import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { searchService } from '@/lib/search';

class SearchHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const hits = await searchService.crossEntitySearch(ctx.tenantId, q);
    return this.success(hits);
  }
}

const handler = new SearchHandler();
export const GET = handler.handle('GET');
