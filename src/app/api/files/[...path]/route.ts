import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const segments = (await params).path;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Prevent directory traversal
    const requestedPath = segments.join('/');
    if (requestedPath.includes('..') || requestedPath.includes('~')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const filePath = path.join(DATA_DIR, requestedPath);
    const resolvedPath = path.resolve(filePath);

    // Ensure the resolved path is within the data directory
    if (!resolvedPath.startsWith(path.resolve(DATA_DIR))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if the file exists
    try {
      const fileStat = await stat(resolvedPath);
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const fileBuffer = await readFile(resolvedPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
