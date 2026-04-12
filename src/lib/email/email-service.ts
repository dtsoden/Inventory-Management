import nodemailer from 'nodemailer';
import { getVaultSecret } from '@/lib/config/vault';
import { prisma } from '@/lib/db';

export interface SendPurchaseOrderOptions {
  to: string;
  vendorName: string;
  contactName?: string | null;
  orderNumber: string;
  pdfBuffer: Buffer;
  fromEmail?: string;
}

async function getSmtpConfig() {
  const [host, port, user, password, from] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'smtp_host' } }).then(r => r?.value || null),
    prisma.systemConfig.findUnique({ where: { key: 'smtp_port' } }).then(r => r?.value || '587'),
    prisma.systemConfig.findUnique({ where: { key: 'smtp_user' } }).then(r => r?.value || null),
    getVaultSecret('smtp_password'),
    prisma.systemConfig.findUnique({ where: { key: 'smtp_from' } }).then(r => r?.value || null),
  ]);
  return { host, port, user, password, from };
}

export class EmailService {
  async sendPurchaseOrder(options: SendPurchaseOrderOptions): Promise<void> {
    const smtp = await getSmtpConfig();
    if (!smtp.host) {
      throw new Error('SMTP not configured. Set it in Settings > Integrations.');
    }

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port || '587', 10),
      secure: parseInt(smtp.port || '587', 10) === 465,
      auth:
        smtp.user && smtp.password
          ? { user: smtp.user, pass: smtp.password }
          : undefined,
    });

    const fromAddress =
      options.fromEmail || smtp.from || 'noreply@inventory.local';

    const greetingName =
      options.contactName && options.contactName.trim()
        ? options.contactName.trim()
        : options.vendorName;

    await transport.sendMail({
      from: fromAddress,
      to: options.to,
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
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const emailService = new EmailService();
