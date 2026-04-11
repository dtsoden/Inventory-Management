import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { fetchExternalCatalog } from '@/lib/procurement/catalog-api';

class CatalogFetchHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    let apiUrl: string | undefined;
    try {
      const body = await req.json();
      if (body?.apiUrl && typeof body.apiUrl === 'string') {
        apiUrl = body.apiUrl;
      }
    } catch {
      // no body, use default url
    }
    const products = await fetchExternalCatalog(apiUrl);
    return this.success(products);
  }
}

const handler = new CatalogFetchHandler();
export const POST = handler.handle('POST');
