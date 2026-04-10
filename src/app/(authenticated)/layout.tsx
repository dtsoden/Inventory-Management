import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
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

  // Validate that the session's tenant still exists in the DB.
  // If the DB was reset, the JWT contains a stale tenant ID.
  const user = session.user as { tenantId?: string };
  if (user.tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true },
      });
      if (!tenant) {
        // Stale session - force re-login
        redirect('/api/auth/signout?callbackUrl=/login');
      }
    } catch {
      redirect('/api/auth/signout?callbackUrl=/login');
    }
  }

  return <AppShell>{children}</AppShell>;
}
