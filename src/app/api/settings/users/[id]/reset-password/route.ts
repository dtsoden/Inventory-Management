import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { passwordResetService } from '@/lib/users/PasswordResetService';

class AdminResetPasswordHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const userId = segments[segments.indexOf('users') + 1];
    const baseUrl = req.headers.get('origin') || req.nextUrl.origin;

    await passwordResetService.adminResetPassword(userId, ctx.tenantId, baseUrl);
    return this.successMessage('Password reset email sent');
  }
}

const handler = new AdminResetPasswordHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
