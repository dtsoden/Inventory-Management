import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseBranding } from '@/lib/branding';

// Public, unauthenticated branding endpoint. Exposes only the values that
// already render in the public-facing HTML head (app name, logo URLs,
// favicon URL, primary colors, theme mode). Used by the Docusaurus
// documentation site to inherit the live tenant branding.
export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({
      select: { name: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: true, data: null },
        { headers: { 'Cache-Control': 'public, max-age=60' } },
      );
    }

    const branding = parseBranding(tenant.settings as string | null);

    return NextResponse.json(
      {
        success: true,
        data: {
          appName: branding.appName || tenant.name,
          logoUrlLight: branding.logoUrlLight,
          logoUrlDark: branding.logoUrlDark,
          faviconUrl: branding.faviconUrl,
          primaryColorLight: branding.primaryColorLight,
          primaryColorDark: branding.primaryColorDark,
          themeMode: branding.themeMode,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    console.error('GET /api/branding/public error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
