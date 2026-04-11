import { BaseRepository } from '@/lib/base/BaseRepository';

export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublicView {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface UserProfileView extends UserPublicView {
  tenant: { name: string };
}

const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export class UserRepository extends BaseRepository<UserRecord> {
  protected get modelName(): string {
    return 'user';
  }

  /** Email unique-globally lookup. Used for login + duplicate checks. */
  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.model.findUnique({ where: { email } });
  }

  /** Tenant-scoped list of public-view users. */
  async listForTenant(tenantId: string): Promise<UserPublicView[]> {
    return this.model.findMany({
      where: { tenantId },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tenant-scoped find by id. */
  async findByIdInTenant(
    tenantId: string,
    id: string,
  ): Promise<UserRecord | null> {
    return this.model.findFirst({ where: { id, tenantId } });
  }

  /** Tenant-scoped find by id with the joined tenant name (profile view). */
  async findProfileById(id: string): Promise<UserProfileView | null> {
    return this.model.findUnique({
      where: { id },
      select: {
        ...PUBLIC_SELECT,
        tenant: { select: { name: true } },
      },
    });
  }

  /** Count active admins for a tenant. Used by last-admin protection. */
  async countActiveAdmins(tenantId: string): Promise<number> {
    return this.model.count({
      where: { tenantId, role: 'ADMIN', isActive: true },
    });
  }

  /** Email already taken globally (by anyone other than excludeId)? */
  async isEmailTakenByOther(
    email: string,
    excludeId: string,
  ): Promise<boolean> {
    const existing = await this.model.findUnique({ where: { email } });
    return existing !== null && existing.id !== excludeId;
  }

  /** Create with raw data. Caller is responsible for hashing the password. */
  async createUser(data: {
    tenantId: string;
    email: string;
    name: string;
    passwordHash: string;
    role: string;
  }): Promise<UserPublicView> {
    return this.model.create({
      data,
      select: PUBLIC_SELECT,
    });
  }

  async updatePublic(
    id: string,
    data: Record<string, unknown>,
  ): Promise<UserPublicView> {
    return this.model.update({
      where: { id },
      data,
      select: PUBLIC_SELECT,
    });
  }

  async updateProfile(
    id: string,
    data: Record<string, unknown>,
  ): Promise<UserProfileView> {
    return this.model.update({
      where: { id },
      data,
      select: {
        ...PUBLIC_SELECT,
        tenant: { select: { name: true } },
      },
    });
  }

  async getPasswordHash(id: string): Promise<string | null> {
    const row = await this.model.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    return row?.passwordHash ?? null;
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.model.update({ where: { id }, data: { passwordHash } });
  }

  async setAvatarUrl(id: string, avatarUrl: string | null): Promise<void> {
    await this.model.update({ where: { id }, data: { avatarUrl } });
  }
}
