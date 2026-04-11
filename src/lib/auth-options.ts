import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

async function getClientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    return (
      h.get('cf-connecting-ip') ||
      h.get('x-forwarded-for')?.split(',')[0].trim() ||
      h.get('x-real-ip') ||
      undefined
    );
  } catch {
    return undefined;
  }
}

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
        const ipAddress = await getClientIp();

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        // Audit unknown email
        if (!user) {
          try {
            const anyTenant = await prisma.tenant.findFirst({ select: { id: true } });
            if (anyTenant) {
              await prisma.auditLog.create({
                data: {
                  tenantId: anyTenant.id,
                  userId: null,
                  action: 'LOGIN_FAILED',
                  entity: 'User',
                  entityId: null,
                  details: JSON.stringify({ email: credentials.email, reason: 'unknown_email' }),
                  ipAddress,
                },
              });
            }
          } catch (e) {
            console.error('Audit log failed for LOGIN_FAILED (unknown email):', e);
          }
          return null;
        }

        // Audit inactive user
        if (!user.isActive) {
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.id,
                action: 'LOGIN_FAILED',
                entity: 'User',
                entityId: user.id,
                details: JSON.stringify({ email: user.email, reason: 'inactive_account' }),
                ipAddress,
              },
            });
          } catch (e) {
            console.error('Audit log failed for LOGIN_FAILED (inactive):', e);
          }
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          try {
            await prisma.auditLog.create({
              data: {
                tenantId: user.tenantId,
                userId: user.id,
                action: 'LOGIN_FAILED',
                entity: 'User',
                entityId: user.id,
                details: JSON.stringify({ email: user.email, reason: 'bad_password' }),
                ipAddress,
              },
            });
          } catch (e) {
            console.error('Audit log failed for LOGIN_FAILED (bad password):', e);
          }
          return null;
        }

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Audit: successful sign-in
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              action: 'LOGIN',
              entity: 'User',
              entityId: user.id,
              details: JSON.stringify({ email: user.email }),
              ipAddress,
            },
          });
        } catch (e) {
          console.error('Audit log failed for LOGIN:', e);
        }

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
  events: {
    async signOut({ token }) {
      const t = token as Record<string, unknown> | null;
      const tenantId = t?.tenantId as string | undefined;
      const userId = t?.id as string | undefined;
      if (!tenantId || !userId) return;
      const ipAddress = await getClientIp();
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'LOGOUT',
            entity: 'User',
            entityId: userId,
            ipAddress,
          },
        });
      } catch (e) {
        console.error('Audit log failed for LOGOUT:', e);
      }
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
