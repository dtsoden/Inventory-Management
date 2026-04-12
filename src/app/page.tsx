import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getAuthOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  // 1. Check if setup is complete
  try {
    const setupState = await prisma.setupState.findUnique({ where: { id: 1 } });
    if (!setupState?.isSetupComplete) {
      redirect('/setup');
    }
  } catch {
    // If setup table does not exist yet, redirect to setup
    redirect('/setup');
  }

  // 2. Check if user is authenticated
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  // 3. Authenticated user with complete setup: go to dashboard
  redirect('/dashboard');
}
