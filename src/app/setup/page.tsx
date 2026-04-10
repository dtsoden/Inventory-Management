import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SetupWizard } from './_components/SetupWizard';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  let isComplete = false;

  try {
    const setupState = await prisma.setupState.findUnique({
      where: { id: 1 },
    });
    isComplete = setupState?.isSetupComplete ?? false;
  } catch {
    // If the table doesn't exist yet, setup has not been completed
    isComplete = false;
  }

  if (isComplete) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--brand-green)]/10 to-[color:var(--brand-purple)]/10 flex items-center justify-center p-4">
      <SetupWizard />
    </div>
  );
}
