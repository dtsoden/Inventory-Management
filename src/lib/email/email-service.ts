import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';
import { ValidationError } from '@/lib/errors';
import {
  smtpSettingsService,
  type SmtpSettings,
  type SmtpSettingsInput,
  type SmtpSettingsService,
} from './SmtpSettingsService';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  from?: string;
}

export interface SendPurchaseOrderOptions {
  to: string;
  vendorName: string;
  contactName?: string | null;
  orderNumber: string;
  pdfBuffer: Buffer;
  fromEmail?: string;
}

export interface SendPasswordResetOptions {
  to: string;
  name: string;
  resetUrl: string;
  expiryHours: number;
}

export interface SendNotificationOptions {
  to: string;
  name: string;
  title: string;
  message: string;
  link?: string | null;
}

export interface SmtpTestResult {
  host: string;
  port: number;
  from: string;
  to: string;
  messageId: string;
}

const FALLBACK_FROM = 'noreply@inventory.local';
const TIMEOUT_MS = 15_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The only class in the app that talks to an SMTP server. Settings come
 * from SmtpSettingsService (Settings > Integrations > Email), so every
 * email the platform sends uses the same global configuration.
 */
export class EmailService {
  private readonly configRepo = new SystemConfigRepository(prisma);

  constructor(private readonly settings: SmtpSettingsService = smtpSettingsService) {}

  async isConfigured(): Promise<boolean> {
    return this.settings.isConfigured();
  }

  async send(message: EmailMessage): Promise<string> {
    const smtp = await this.settings.resolve();
    return this.deliver(smtp, message);
  }

  /**
   * Log in to the SMTP server and send a real message to `to`. Uses the
   * unsaved form values when given, so the admin can test before saving.
   */
  async sendTest(to: string, input?: SmtpSettingsInput): Promise<SmtpTestResult> {
    const recipient = to.trim();
    if (!EMAIL_PATTERN.test(recipient)) {
      throw new ValidationError('Enter a valid email address to send the test to');
    }
    const smtp = await this.settings.resolve(input);
    const transport = this.createTransport(smtp);
    try {
      await transport.verify();
    } catch (err) {
      throw new ValidationError(`Could not connect to ${smtp.host}:${smtp.port}. ${this.describe(err)}`);
    }

    const platform = await this.platformName();
    const messageId = await this.deliver(
      smtp,
      {
        to: recipient,
        subject: `${platform} SMTP test`,
        html: [
          `<p>This is a test email from ${escapeHtml(platform)}.</p>`,
          `<p>If you can read this, outbound email is working. Purchase orders, password resets and notification emails all use these settings.</p>`,
          `<p>Server: ${escapeHtml(smtp.host)}:${smtp.port}<br>From: ${escapeHtml(this.fromAddress(smtp))}</p>`,
        ].join('\n'),
      },
      transport,
    );
    return { host: smtp.host, port: smtp.port, from: this.fromAddress(smtp), to: recipient, messageId };
  }

  async sendPurchaseOrder(options: SendPurchaseOrderOptions): Promise<void> {
    const greetingName = options.contactName?.trim() || options.vendorName;
    await this.send({
      to: options.to,
      from: options.fromEmail,
      subject: `Purchase Order ${options.orderNumber}`,
      html: [
        `<p>Hello ${escapeHtml(greetingName)},</p>`,
        `<p>Please find attached purchase order <strong>${escapeHtml(options.orderNumber)}</strong>.</p>`,
        `<p>Thank you for your continued partnership.</p>`,
        `<p>Regards</p>`,
      ].join('\n'),
      attachments: [
        {
          filename: `PO-${options.orderNumber}.pdf`,
          content: options.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  async sendPasswordReset(options: SendPasswordResetOptions): Promise<void> {
    const platform = await this.platformName();
    await this.send({
      to: options.to,
      subject: `Password Reset - ${platform}`,
      html: [
        `<p>Hello ${escapeHtml(options.name)},</p>`,
        `<p>A password reset was requested for your account. Click the link below to set a new password:</p>`,
        `<p><a href="${escapeHtml(options.resetUrl)}">${escapeHtml(options.resetUrl)}</a></p>`,
        `<p>This link expires in ${options.expiryHours} hours. If you did not request this, ignore this email.</p>`,
      ].join('\n'),
    });
  }

  async sendNotification(options: SendNotificationOptions): Promise<void> {
    const platform = await this.platformName();
    const url = await this.absoluteUrl(options.link);
    const linkHtml = url
      ? `<p><a href="${escapeHtml(url)}">Open in ${escapeHtml(platform)}</a></p>`
      : '';
    await this.send({
      to: options.to,
      subject: `${options.title} - ${platform}`,
      html: [
        `<p>Hello ${escapeHtml(options.name)},</p>`,
        `<p><strong>${escapeHtml(options.title)}</strong></p>`,
        `<p>${escapeHtml(options.message)}</p>`,
        linkHtml,
        `<p style="color:#888;font-size:12px">You can turn these emails off under Settings > Notifications.</p>`,
      ].join('\n'),
    });
  }

  // ----- internals -----

  private createTransport(smtp: SmtpSettings): Transporter {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      // 465 is implicit TLS; every other port upgrades with STARTTLS.
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }

  private async deliver(
    smtp: SmtpSettings,
    message: EmailMessage,
    transport: Transporter = this.createTransport(smtp),
  ): Promise<string> {
    try {
      const info = await transport.sendMail({
        from: message.from || this.fromAddress(smtp),
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
      });
      return info.messageId;
    } catch (err) {
      throw new ValidationError(`Email to ${message.to} failed. ${this.describe(err)}`);
    }
  }

  private fromAddress(smtp: SmtpSettings): string {
    return smtp.from || FALLBACK_FROM;
  }

  private describe(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const e = err as Error & { code?: string; response?: string };
    return e.response || e.message || e.code || 'Unknown SMTP error';
  }

  /** In-app links are relative; email needs the public URL saved at setup. */
  private async absoluteUrl(link?: string | null): Promise<string | null> {
    if (!link) return null;
    if (/^https?:\/\//i.test(link)) return link;
    const base = (await this.configRepo.findByKey('app_url'))?.value || process.env.NEXTAUTH_URL;
    return base ? `${base.replace(/\/+$/, '')}${link.startsWith('/') ? '' : '/'}${link}` : null;
  }

  private async platformName(): Promise<string> {
    const row = await this.configRepo.findByKey('platform_name');
    return row?.value || 'Inventory';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const emailService = new EmailService();
