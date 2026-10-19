import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/lib/users/PasswordResetService';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      );
    }

    const baseUrl = req.headers.get('origin') || req.nextUrl.origin;
    await passwordResetService.requestReset(email, baseUrl);

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    // Same response either way so the endpoint can't be used to probe
    // which emails exist, but log delivery failures for the admin.
    console.error('Password reset email failed:', err);
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }
}
