import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Parse name into firstName and lastName
        const nameParts = user.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as SessionUser;
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
        token.tenantSlug = u.tenantSlug;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as unknown as SessionUser;
        sessionUser.id = token.id as string;
        sessionUser.role = token.role as SessionUser['role'];
        sessionUser.tenantId = token.tenantId as string;
        sessionUser.tenantSlug = token.tenantSlug as string;
        sessionUser.firstName = token.firstName as string;
        sessionUser.lastName = token.lastName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
};
