import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BaseService } from '@/lib/base/BaseService';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '@/lib/errors';
import { TenantContext, UserRole } from '@/lib/types';
import {
  UserRepository,
  type UserRecord,
  type UserPublicView,
  type UserProfileView,
} from './UserRepository';

const LAST_ADMIN_ERROR =
  'Cannot remove the last administrator. The system must always have at least one active admin.';

export class LastAdminError extends AppError {
  constructor() {
    super(LAST_ADMIN_ERROR, 400, 'LAST_ADMIN');
  }
}

export class EmailTakenError extends AppError {
  constructor() {
    super('A user with this email already exists', 409, 'EMAIL_TAKEN');
  }
}

export class SelfActionForbidden extends AppError {
  constructor(action: string) {
    super(`Cannot ${action} your own account`, 400, 'SELF_ACTION_FORBIDDEN');
  }
}

export class InvalidPasswordError extends AppError {
  constructor() {
    super('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }
}

/**
 * UserService is the only place that should bcrypt-hash passwords or
 * apply the last-admin protection rule. Centralized so route handlers
 * never duplicate the logic and never get it wrong.
 */
export class UserService extends BaseService<UserRecord> {
  private readonly userRepo: UserRepository;

  constructor(prisma: PrismaClient) {
    const repo = new UserRepository(prisma);
    super(repo, prisma);
    this.userRepo = repo;
  }

  protected get entityName(): string {
    return 'User';
  }

  // ----- Reads -----

  async listForTenant(ctx: TenantContext): Promise<UserPublicView[]> {
    this.requireAdmin(ctx);
    return this.userRepo.listForTenant(ctx.tenantId);
  }

  async getMyProfile(userId: string): Promise<UserProfileView> {
    const user = await this.userRepo.findProfileById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  // ----- Admin user management -----

  async createUser(
    ctx: TenantContext,
    input: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    },
  ): Promise<UserPublicView> {
    this.requireAdmin(ctx);

    const name = (input.name ?? '').trim();
    const email = (input.email ?? '').trim().toLowerCase();
    const password = input.password ?? '';

    if (!name || !email || !password) {
      throw new ValidationError('Name, email, and password are required');
    }
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new EmailTakenError();

    const role = input.role || 'WAREHOUSE_STAFF';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userRepo.createUser({
      tenantId: ctx.tenantId,
      name,
      email,
      passwordHash,
      role,
    });

    await this.logAudit(ctx, 'CREATE', user.id, {
      details: `Created user ${name} (${email}) with role ${role}`,
    });

    return user;
  }

  async updateUser(
    ctx: TenantContext,
    targetId: string,
    input: {
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    },
  ): Promise<UserPublicView> {
    this.requireAdmin(ctx);

    const target = await this.userRepo.findByIdInTenant(ctx.tenantId, targetId);
    if (!target) throw new NotFoundError('User', targetId);

    const updateData: Record<string, unknown> = {};
    const isTargetActiveAdmin = target.role === 'ADMIN' && target.isActive;

    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || !input.name.trim()) {
        throw new ValidationError('Name cannot be empty');
      }
      updateData.name = input.name.trim();
    }

    if (input.email !== undefined) {
      if (typeof input.email !== 'string' || !input.email.trim()) {
        throw new ValidationError('Email cannot be empty');
      }
      const newEmail = input.email.trim().toLowerCase();
      if (newEmail !== target.email) {
        const taken = await this.userRepo.isEmailTakenByOther(newEmail, targetId);
        if (taken) throw new EmailTakenError();
      }
      updateData.email = newEmail;
    }

    if (input.role !== undefined) {
      if (input.role === 'ADMIN' && ctx.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Cannot assign ADMIN role');
      }
      if (isTargetActiveAdmin && input.role !== 'ADMIN') {
        const adminCount = await this.userRepo.countActiveAdmins(ctx.tenantId);
        if (adminCount <= 1) throw new LastAdminError();
      }
      updateData.role = input.role;
    }

    if (input.isActive !== undefined) {
      if (targetId === ctx.userId && input.isActive === false) {
        throw new SelfActionForbidden('deactivate');
      }
      if (isTargetActiveAdmin && input.isActive === false) {
        const adminCount = await this.userRepo.countActiveAdmins(ctx.tenantId);
        if (adminCount <= 1) throw new LastAdminError();
      }
      updateData.isActive = input.isActive;
    }

    const updated = await this.userRepo.updatePublic(targetId, updateData);

    const changes = Object.entries(updateData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    await this.logAudit(ctx, 'UPDATE', targetId, {
      details: `Updated user ${target.name}: ${changes}`,
    });

    return updated;
  }

  /** Soft delete by deactivating. Last-admin protected, self-protected. */
  async deactivateUser(ctx: TenantContext, targetId: string): Promise<void> {
    this.requireAdmin(ctx);

    if (targetId === ctx.userId) {
      throw new SelfActionForbidden('delete');
    }

    const target = await this.userRepo.findByIdInTenant(ctx.tenantId, targetId);
    if (!target) throw new NotFoundError('User', targetId);

    if (target.role === 'ADMIN' && target.isActive) {
      const adminCount = await this.userRepo.countActiveAdmins(ctx.tenantId);
      if (adminCount <= 1) throw new LastAdminError();
    }

    await this.userRepo.updatePublic(targetId, { isActive: false });
    await this.logAudit(ctx, 'DELETE', targetId, {
      details: `Deactivated user ${target.name} (${target.email})`,
    });
  }

  // ----- Self-service profile -----

  async updateMyProfile(
    userId: string,
    tenantId: string,
    input: { name?: string; email?: string },
  ): Promise<UserProfileView> {
    const name = (input.name ?? '').trim();
    if (!name) throw new ValidationError('Name is required');

    const email = (input.email ?? '').trim();
    if (!email || !email.includes('@')) {
      throw new ValidationError('A valid email is required');
    }

    // Email uniqueness within tenant, excluding self.
    const existing = await this.userRepo.findByEmail(email);
    if (existing && existing.id !== userId && existing.tenantId === tenantId) {
      throw new EmailTakenError();
    }

    return this.userRepo.updateProfile(userId, { name, email });
  }

  async changeMyPassword(
    userId: string,
    input: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    },
  ): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = input;
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ValidationError('All password fields are required');
    }
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }
    if (newPassword !== confirmPassword) {
      throw new ValidationError('New password and confirmation do not match');
    }

    const currentHash = await this.userRepo.getPasswordHash(userId);
    if (!currentHash) throw new NotFoundError('User', userId);

    const isValid = await bcrypt.compare(currentPassword, currentHash);
    if (!isValid) throw new InvalidPasswordError();

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.setPasswordHash(userId, hashed);
  }

  async setMyAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    await this.userRepo.setAvatarUrl(userId, avatarUrl);
  }

  // ----- Helpers -----

  private requireAdmin(ctx: TenantContext): void {
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can perform this action');
    }
  }
}
