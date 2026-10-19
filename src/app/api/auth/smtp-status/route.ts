import { NextResponse } from 'next/server';
import { smtpSettingsService } from '@/lib/email/SmtpSettingsService';

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: { configured: await smtpSettingsService.isConfigured() } });
  } catch {
    return NextResponse.json({ success: true, data: { configured: false } });
  }
}
