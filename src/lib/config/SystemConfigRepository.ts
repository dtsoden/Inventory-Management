import type { PrismaClient } from '@prisma/client';

/**
 * The single point of access for the SystemConfig table.
 *
 * Why it does NOT extend BaseRepository:
 *  SystemConfig is a global key-value store, not a tenant-scoped
 *  domain entity. It has no tenantId, no isActive, and is keyed by
 *  `key` rather than `id`. Forcing it into BaseRepository would
 *  require disabling tenant filtering and isActive checks, which
 *  defeats the point of the base class. Instead this class follows
 *  the same encapsulation contract: every prisma.systemConfig.*
 *  call in the entire codebase MUST go through one of the methods
 *  below.
 */

export interface SystemConfigRow {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  category: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertSystemConfigInput {
  key: string;
  value: string;
  isSecret: boolean;
  category: string;
  description?: string | null;
}

export class SystemConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private get model() {
    return (this.prisma as unknown as { systemConfig: any }).systemConfig;
  }

  async findByKey(key: string): Promise<SystemConfigRow | null> {
    return this.model.findUnique({ where: { key } });
  }

  async findByCategory(category: string): Promise<SystemConfigRow[]> {
    return this.model.findMany({ where: { category } });
  }

  async upsert(input: UpsertSystemConfigInput): Promise<SystemConfigRow> {
    const { key, value, isSecret, category, description } = input;
    return this.model.upsert({
      where: { key },
      create: { key, value, isSecret, category, description: description ?? null },
      update: { value, isSecret, category, description: description ?? null },
    });
  }

  async deleteByKey(key: string): Promise<void> {
    await this.model.delete({ where: { key } });
  }

  async existsByKey(key: string): Promise<boolean> {
    const row = await this.model.findUnique({
      where: { key },
      select: { id: true },
    });
    return row !== null;
  }
}
