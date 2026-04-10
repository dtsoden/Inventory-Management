import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { UnauthorizedError } from '@/lib/errors';
import type { SessionUser, TenantContext } from '@/lib/types';

export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user as unknown as SessionUser;
}

export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireAuth();
  return {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
  };
}
