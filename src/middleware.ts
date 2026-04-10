import { NextRequest, NextResponse } from 'next/server';
import { applyCors, handlePreflight } from './lib/middleware/cors';

export async function middleware(req: NextRequest) {
  const preflightResponse = handlePreflight(req);
  if (preflightResponse) return applyCors(req, preflightResponse);

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return applyCors(req, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
