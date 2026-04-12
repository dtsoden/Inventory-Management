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
    const host = await this.prisma.systemConfig.findUnique({
      where: { key: 'smtp_host' },
    });
    return !!host?.value;
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

    const resetUrl = `${baseUrl}/login/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const smtp = await this.getSmtpConfig();
    if (!smtp.host) return;

    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port || '587', 10),
      secure: parseInt(smtp.port || '587', 10) === 465,
      auth: smtp.user && smtp.password
        ? { user: smtp.user, pass: smtp.password }
        : undefined,
    });

    const platformName = await this.prisma.systemConfig.findUnique({
      where: { key: 'platform_name' },
    });

    await transport.sendMail({
      from: smtp.from || 'noreply@inventory.local',
      to: email,
      subject: `Password Reset - ${platformName?.value || 'Inventory'}`,
      html: [
        `<p>Hello ${user.name},</p>`,
        `<p>A password reset was requested for your account. Click the link below to set a new password:</p>`,
        `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
        `<p>This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you did not request this, ignore this email.</p>`,
      ].join('\n'),
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

    await this.requestReset(user.email, baseUrl);
  }

  private async getSmtpConfig() {
    const { getVaultSecret } = await import('@/lib/config/vault');
    const [host, port, user, password, from] = await Promise.all([
      this.prisma.systemConfig.findUnique({ where: { key: 'smtp_host' } }).then(r => r?.value || null),
      this.prisma.systemConfig.findUnique({ where: { key: 'smtp_port' } }).then(r => r?.value || '587'),
      this.prisma.systemConfig.findUnique({ where: { key: 'smtp_user' } }).then(r => r?.value || null),
      getVaultSecret('smtp_password'),
      this.prisma.systemConfig.findUnique({ where: { key: 'smtp_from' } }).then(r => r?.value || null),
    ]);
    return { host, port, user, password, from };
  }
}

export const passwordResetService = new PasswordResetService();
