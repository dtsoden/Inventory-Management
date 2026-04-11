import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { applyCors, handlePreflight } from './lib/middleware/cors';

export async function middleware(req: NextRequest) {
  const preflightResponse = handlePreflight(req);
  if (preflightResponse) return applyCors(req, preflightResponse);

  // Gate /docs/admin/* to authenticated ADMIN users only.
  // Static Docusaurus output lives under /docs and is otherwise public.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/docs/admin')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
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
