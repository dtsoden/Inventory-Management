import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth';
import { fetchExternalCatalog } from '@/lib/procurement/catalog-api';

export async function POST(req: NextRequest) {
  try {
    await requireTenantContext();

    let apiUrl: string | undefined;

    try {
      const body = await req.json();
      if (body?.apiUrl && typeof body.apiUrl === 'string') {
        apiUrl = body.apiUrl;
      }
    } catch {
      // No body or invalid JSON; use default URL
    }

    const products = await fetchExternalCatalog(apiUrl);

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status }
    );
  }
}
