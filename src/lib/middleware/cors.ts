import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS middleware for Next.js Edge runtime.
 *
 * Reads allowed origins from the CORS_ORIGINS environment variable or
 * defaults to '*'. The SystemConfig-based CORS setting is applied at
 * the API route level via ConfigService, not here in Edge middleware
 * (Prisma cannot run in Edge runtime).
 *
 * The setup wizard writes the configured origins to both SystemConfig
 * (for API-level enforcement) and this middleware uses a simple env
 * fallback for the Edge layer.
 */
export async function applyCors(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = process.env.CORS_ORIGINS || '*';

  const isAllowed =
    allowedOrigins === '*' ||
    allowedOrigins.split(',').map((o) => o.trim()).includes(origin);

  const effectiveOrigin = allowedOrigins === '*' ? '*' : isAllowed ? origin : '';

  if (effectiveOrigin) {
    res.headers.set('Access-Control-Allow-Origin', effectiveOrigin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Max-Age', '86400');
  }

  return res;
}

export function handlePreflight(req: NextRequest): NextResponse | null {
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204 });
  return null;
}
