import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../db';

export async function applyCors(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const origin = req.headers.get('origin') || '';
  let allowedOrigins = '*';
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'cors_origins' } });
    if (config) allowedOrigins = config.value;
  } catch { allowedOrigins = '*'; }

  const isAllowed = allowedOrigins === '*' || allowedOrigins.split(',').map(o => o.trim()).includes(origin);
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
