import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import { userService } from '@/lib/users';
import type { ApiResponse } from '@/lib/types';

// Profile routes use requireAuth (current user) rather than the
// admin-only BaseApiHandler+requireTenantContext flow, but still
// delegate all DB access to UserService.

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    const profile = await userService.getMyProfile(sessionUser.id);
    const body: ApiResponse = { success: true, data: profile };
    return NextResponse.json(body);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const data = await req.json();
    const updated = await userService.updateMyProfile(
      sessionUser.id,
      sessionUser.tenantId,
      data,
    );
    const body: ApiResponse = { success: true, data: updated };
    return NextResponse.json(body);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  console.error('Unhandled error in /api/profile:', error);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 },
  );
}
