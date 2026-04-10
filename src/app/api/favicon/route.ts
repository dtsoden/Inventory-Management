import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { parseBranding } from '@/lib/branding';

/**
 * Serves the tenant's favicon if set, or generates a default SVG favicon
 * from the primary color.
 */
export async function GET() {
  try {
    // Try to find a tenant with a custom favicon
    const tenant = await prisma.tenant.findFirst({
      select: { settings: true },
    });

    const branding = parseBranding(tenant?.settings as string | null);

    // If a custom favicon file is set, serve it
    if (branding.faviconUrl) {
      const relativePath = branding.faviconUrl.replace(/^\/api\/files\//, '');
      const filePath = path.join(process.cwd(), 'data', relativePath);

      try {
        const fileBuffer = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          ext === '.ico'
            ? 'image/x-icon'
            : ext === '.svg'
              ? 'image/svg+xml'
              : ext === '.png'
                ? 'image/png'
                : 'image/x-icon';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch {
        // Fall through to generated favicon
      }
    }

    // Generate an SVG favicon from the primary color
    const color = branding.primaryColorLight || '#7ed321';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${color}"/>
  <text x="16" y="23" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">I</text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET /api/favicon error:', error);
    // Return a simple default favicon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#7ed321"/>
  <text x="16" y="23" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">I</text>
</svg>`;
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}
