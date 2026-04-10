import { useSession } from 'next-auth/react';
import type { SessionUser } from '@/lib/types';

export function useCurrentUser(): SessionUser | null {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}
