import { randomBytes, createHash } from 'crypto';
import { hash } from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/db';
import { emailService } from '@/lib/email/email-service';
import { ValidationError, NotFoundError } from '@/lib/errors';

const TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class PasswordResetService {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async isSmtpConfigured(): Promise<boolean> {
    return emailService.isConfigured();
  }

  async requestReset(email: string, baseUrl: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user || !user.isActive) return;

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });

    if (!(await emailService.isConfigured())) return;

    const resetUrl = `${baseUrl}/login/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await emailService.sendPasswordReset({
      to: email,
      name: user.name,
      resetUrl,
      expiryHours: TOKEN_EXPIRY_HOURS,
    });
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError('User', email);

    if (!user.resetToken || !user.resetTokenExpiresAt) {
      throw new ValidationError('No password reset was requested');
    }

    const tokenHash = hashToken(token);
    if (tokenHash !== user.resetToken) {
      throw new ValidationError('Invalid reset token');
    }

    if (new Date() > new Date(user.resetTokenExpiresAt)) {
      throw new ValidationError('Reset token has expired');
    }

    const passwordHash = await hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  async adminResetPassword(userId: string, tenantId: string, baseUrl: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundError('User', userId);
    if (!(await emailService.isConfigured())) {
      throw new ValidationError('SMTP is not configured. Set it up in Settings > Integrations > Email first.');
    }

    await this.requestReset(user.email, baseUrl);
  }
}

export const passwordResetService = new PasswordResetService();
