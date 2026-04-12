import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { applyCors, handlePreflight } from './lib/middleware/cors';
import { getAuthSecret } from '@/lib/auth-secret';

export async function middleware(req: NextRequest) {
  const preflightResponse = handlePreflight(req);
  if (preflightResponse) return applyCors(req, preflightResponse);

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/docs/admin')) {
    const secret = await getAuthSecret();
    const token = await getToken({
      req,
      secret,
    });
    if (!token || (token as { role?: string }).role !== 'ADMIN') {
      const url = req.nextUrl.clone();
      url.pathname = '/docs/user/getting-started';
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return applyCors(req, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
