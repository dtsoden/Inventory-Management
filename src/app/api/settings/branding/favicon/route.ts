import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'branding');
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can upload a favicon');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    // Allow .ico by extension when MIME type is missing or generic
    const filename = file.name.toLowerCase();
    const isIco = filename.endsWith('.ico');
    if (!ALLOWED_TYPES.includes(file.type) && !isIco) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP, ICO.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 1MB.' },
        { status: 400 },
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const savedFilename = `${ctx.tenantId}-favicon-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, savedFilename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/api/files/uploads/branding/${savedFilename}`;

    return NextResponse.json({ success: true, data: { url } });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('POST /api/settings/branding/favicon error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
