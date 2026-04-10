import nodemailer from 'nodemailer';

export interface SendPurchaseOrderOptions {
  to: string;
  vendorName: string;
  orderNumber: string;
  pdfBuffer: Buffer;
  fromEmail?: string;
}

export class EmailService {
  async sendPurchaseOrder(options: SendPurchaseOrderOptions): Promise<void> {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    const fromAddress =
      options.fromEmail ||
      process.env.SMTP_FROM ||
      'noreply@inventory.local';

    await transport.sendMail({
      from: fromAddress,
      to: options.to,
      subject: `Purchase Order ${options.orderNumber}`,
      html: [
        `<p>Dear ${escapeHtml(options.vendorName)},</p>`,
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
