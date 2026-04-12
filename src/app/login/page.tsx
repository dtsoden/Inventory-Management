import { prisma } from '@/lib/db';
import { parseBranding } from '@/lib/branding';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Read branding from the first tenant for the login page
  // In multi-tenant with subdomains, this would use the hostname to find the right tenant
  let branding = undefined;
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: { settings: true },
      orderBy: { createdAt: 'asc' },
    });
    if (tenant?.settings) {
      const parsed = parseBranding(tenant.settings as string);
      branding = {
        primaryColor: parsed.primaryColorLight || '#7ed321',
        logoUrlLight: parsed.logoUrlLight ?? null,
        logoUrlDark: parsed.logoUrlDark ?? null,
        appName: parsed.appName,
        themeMode: parsed.themeMode || 'auto',
      };
    }
  } catch {
    // No tenant yet (fresh install), use defaults
  }

  return <LoginForm branding={branding} />;
}
