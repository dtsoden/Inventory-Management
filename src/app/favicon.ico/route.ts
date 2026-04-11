/**
 * Forwards /favicon.ico requests to the dynamic /api/favicon endpoint
 * which serves the tenant's custom favicon or a generated SVG fallback.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL('/api/favicon', request.url);
  return NextResponse.redirect(url, 307);
}
