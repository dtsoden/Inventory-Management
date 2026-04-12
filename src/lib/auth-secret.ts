import { prisma } from '@/lib/db';

let _cached: string | null = null;

export async function getAuthSecret(): Promise<string> {
  if (_cached) return _cached;

  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: 'nextauth_secret' },
    });
    if (row?.value) {
      _cached = row.value;
      return _cached;
    }
  } catch {
    // DB not ready (pre-setup)
  }

  // Pre-setup: no secret in DB yet. Generate a transient one so NextAuth
  // can serve the setup wizard. Once setup completes it writes the real
  // secret to the DB; the next request picks it up.
  if (!_cached) {
    const { randomBytes } = await import('crypto');
    _cached = randomBytes(32).toString('base64');
  }
  return _cached;
}

export function clearAuthSecretCache(): void {
  _cached = null;
}
