import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { emailService } from '@/lib/email/email-service';

/**
 * POST { to, settings? } logs in to the SMTP server and sends a real
 * test email to `to`. `settings` holds the unsaved form values so the
 * admin can test before saving; a blank password uses the stored one.
 */
class SmtpTestHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const { to, settings } = await req.json();
    const result = await emailService.sendTest(String(to ?? ''), settings);
    return this.success(result);
  }
}

const handler = new SmtpTestHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
