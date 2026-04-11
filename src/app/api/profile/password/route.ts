import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import { userService } from '@/lib/users';
import type { ApiResponse } from '@/lib/types';

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const data = await req.json();
    await userService.changeMyPassword(sessionUser.id, data);
    const body: ApiResponse = { success: true, message: 'Password updated successfully' };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('Unhandled error in PUT /api/profile/password:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
