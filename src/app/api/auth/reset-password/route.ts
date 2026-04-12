import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/users/PasswordResetService';

export async function POST(req: NextRequest) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, token, and password are required' },
        { status: 400 },
      );
    }

    await passwordResetService.resetPassword(email, token, password);
    return NextResponse.json({ success: true, message: 'Password has been reset.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to reset password' },
      { status: 400 },
    );
  }
}
