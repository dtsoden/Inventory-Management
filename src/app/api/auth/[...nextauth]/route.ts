import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth-options';

async function handler(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const authOptions = await getAuthOptions();
  return NextAuth(req as any, ctx as any, authOptions) as any;
}

export { handler as GET, handler as POST };
