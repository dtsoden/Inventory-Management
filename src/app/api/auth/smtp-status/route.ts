import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const host = await prisma.systemConfig.findUnique({ where: { key: 'smtp_host' } });
    return NextResponse.json({ success: true, data: { configured: !!host?.value } });
  } catch {
    return NextResponse.json({ success: true, data: { configured: false } });
  }
}
