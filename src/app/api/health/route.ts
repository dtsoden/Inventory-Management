import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/app-info';

/** Unauthenticated liveness check. Release scripts use it to confirm the running version. */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', version: APP_VERSION },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
