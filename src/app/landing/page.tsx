import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseBranding } from '@/lib/branding';
import { isLandingEnabled } from '@/lib/landing';
import LandingPage from './LandingPage';

export const dynamic = 'force-dynamic';

export default async function Landing() {
  // Hard guard: the landing page must never render unless the LANDING flag is
  // explicitly on. If it is off, fall back to the normal sign-in entry point so
  // a direct hit on /landing behaves exactly like the flag never existed.
  if (!isLandingEnabled()) {
    redirect('/login');
  }

  // Pull branding from the first active tenant so the marketing page wears the
  // customer's name, logo, and accent color (white-label).
  let appName = 'Inventory Management Platform';
  let primaryColor = '#7ed321';
  let logoUrlLight: string | null = null;
  let logoUrlDark: string | null = null;
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: { settings: true },
      orderBy: { createdAt: 'asc' },
    });
    if (tenant?.settings) {
      const parsed = parseBranding(tenant.settings as string);
      appName = parsed.appName;
      primaryColor = parsed.primaryColorDark || parsed.primaryColorLight || primaryColor;
      logoUrlLight = parsed.logoUrlLight;
      logoUrlDark = parsed.logoUrlDark;
    }
  } catch {
    // Pre-setup or DB not ready: fall back to defaults.
  }

  return (
    <LandingPage
      appName={appName}
      primaryColor={primaryColor}
      logoUrlLight={logoUrlLight}
      logoUrlDark={logoUrlDark}
    />
  );
}
