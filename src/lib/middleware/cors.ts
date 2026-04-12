import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS middleware for Next.js Edge runtime.
 *
 * Defaults to '*' (permissive). Fine-grained origin enforcement is
 * handled at the API route level via SystemConfig, not here in Edge
 * middleware (Prisma cannot run in Edge runtime).
 */
export async function applyCors(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const origin = req.headers.get('origin') || '';

  res.headers.set('Access-Control-Allow-Origin', origin || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Max-Age', '86400');

  return res;
}

export function handlePreflight(req: NextRequest): NextResponse | null {
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204 });
  return null;
}
