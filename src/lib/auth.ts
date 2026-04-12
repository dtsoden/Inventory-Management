import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { getAuthOptions } from '@/lib/auth-options';
import { UnauthorizedError } from '@/lib/errors';
import type { SessionUser, TenantContext } from '@/lib/types';

export async function requireAuth(): Promise<SessionUser> {
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user as unknown as SessionUser;
}

// Extract the caller's IP and user-agent from the request headers so audit
// log entries can record WHO did WHAT WHEN and from WHERE.
async function getRequestForensics(): Promise<{
  ipAddress?: string;
  userAgent?: string;
}> {
  try {
    const h = await headers();
    const forwardedFor = h.get('x-forwarded-for');
    const realIp = h.get('x-real-ip');
    const cfIp = h.get('cf-connecting-ip');
    const ipAddress =
      cfIp ||
      (forwardedFor ? forwardedFor.split(',')[0].trim() : undefined) ||
      realIp ||
      undefined;
    const userAgent = h.get('user-agent') || undefined;
    return { ipAddress, userAgent };
  } catch {
    return {};
  }
}

export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireAuth();
  const forensics = await getRequestForensics();
  return {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
    ipAddress: forensics.ipAddress,
    userAgent: forensics.userAgent,
  };
}
