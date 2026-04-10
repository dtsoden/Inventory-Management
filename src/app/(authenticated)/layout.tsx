import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { parseBranding, hexToHsl } from '@/lib/branding';
import { AppShell } from '@/components/shared/AppShell';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { tenantId?: string };
  let brandingCss = '';

  if (user.tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, settings: true },
      });
      if (!tenant) {
        redirect('/api/auth/signout?callbackUrl=/login');
      }

      // Read branding server-side so colors are in the initial HTML (no flash)
      const branding = parseBranding(tenant.settings as string | null);
      const lightColor = branding.primaryColorLight || '#7ed321';
      const darkColor = branding.primaryColorDark || '#7ed321';

      brandingCss = `
        :root { --brand-green: ${lightColor}; }
        .dark { --brand-green: ${darkColor}; }
      `;
    } catch {
      redirect('/api/auth/signout?callbackUrl=/login');
    }
  }

  return (
    <>
      {brandingCss && <style dangerouslySetInnerHTML={{ __html: brandingCss }} />}
      <AppShell>{children}</AppShell>
    </>
  );
}
