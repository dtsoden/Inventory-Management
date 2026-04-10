import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from './BaseRepository';
import { TenantIsolationError, NotFoundError } from '@/lib/errors';

// Concrete implementation for testing
class TestRepository extends BaseRepository<any> {
  protected get modelName(): string {
    return 'testModel';
  }
}

function createMockPrisma() {
  return {
    testModel: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  } as any;
}

describe('BaseRepository', () => {
  let repo: TestRepository;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    repo = new TestRepository(prisma);
  });

  const tenantId = 'tenant-1';

  describe('findAll', () => {
    it('scopes queries to tenant', async () => {
      prisma.testModel.findMany.mockResolvedValue([]);
      prisma.testModel.count.mockResolvedValue(0);

      await repo.findAll(tenantId);

      expect(prisma.testModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, isActive: true }),
        })
      );
      expect(prisma.testModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, isActive: true }),
        })
      );
    });

    it('applies pagination with skip/take and calculates totalPages', async () => {
      prisma.testModel.findMany.mockResolvedValue([{ id: '1' }]);
      prisma.testModel.count.mockResolvedValue(25);

      const result = await repo.findAll(tenantId, {
        pagination: { page: 2, pageSize: 10 },
      });

      expect(prisma.testModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('applies sorting', async () => {
      prisma.testModel.findMany.mockResolvedValue([]);
      prisma.testModel.count.mockResolvedValue(0);

      await repo.findAll(tenantId, {
        sort: { field: 'name', direction: 'asc' },
      });

      expect(prisma.testModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('merges additional where filters', async () => {
      prisma.testModel.findMany.mockResolvedValue([]);
      prisma.testModel.count.mockResolvedValue(0);

      await repo.findAll(tenantId, {
        where: { category: 'electronics' },
      });

      expect(prisma.testModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            isActive: true,
            category: 'electronics',
          }),
        })
      );
    });
  });

  describe('findById', () => {
    it('returns entity scoped to tenant', async () => {
      const entity = { id: 'entity-1', tenantId, name: 'Test' };
      prisma.testModel.findFirst.mockResolvedValue(entity);

      const result = await repo.findById(tenantId, 'entity-1');

      expect(result).toEqual(entity);
      expect(prisma.testModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'entity-1', tenantId, isActive: true },
        include: undefined,
      });
    });

    it('returns null for wrong tenant (no match)', async () => {
      prisma.testModel.findFirst.mockResolvedValue(null);

      const result = await repo.findById('wrong-tenant', 'entity-1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('injects tenantId into created entity', async () => {
      const data = { name: 'New Item' };
      const created = { id: 'new-1', tenantId, ...data };
      prisma.testModel.create.mockResolvedValue(created);

      const result = await repo.create(tenantId, data);

      expect(prisma.testModel.create).toHaveBeenCalledWith({
        data: { ...data, tenantId },
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('verifies tenant ownership before updating', async () => {
      prisma.testModel.findUnique.mockResolvedValue({
        id: 'entity-1',
        tenantId,
      });
      prisma.testModel.update.mockResolvedValue({
        id: 'entity-1',
        name: 'Updated',
      });

      const result = await repo.update(tenantId, 'entity-1', {
        name: 'Updated',
      });

      expect(prisma.testModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'entity-1' },
        select: { id: true, tenantId: true },
      });
      expect(result).toEqual({ id: 'entity-1', name: 'Updated' });
    });

    it('throws TenantIsolationError for wrong tenant', async () => {
      prisma.testModel.findUnique.mockResolvedValue({
        id: 'entity-1',
        tenantId: 'other-tenant',
      });

      await expect(
        repo.update(tenantId, 'entity-1', { name: 'Hacked' })
      ).rejects.toThrow(TenantIsolationError);
    });

    it('throws NotFoundError for non-existent entity', async () => {
      prisma.testModel.findUnique.mockResolvedValue(null);

      await expect(
        repo.update(tenantId, 'missing-id', { name: 'Nope' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('softDelete', () => {
    it('sets isActive to false', async () => {
      prisma.testModel.findUnique.mockResolvedValue({
        id: 'entity-1',
        tenantId,
      });
      prisma.testModel.update.mockResolvedValue({
        id: 'entity-1',
        isActive: false,
      });

      const result = await repo.softDelete(tenantId, 'entity-1');

      expect(prisma.testModel.update).toHaveBeenCalledWith({
        where: { id: 'entity-1' },
        data: { isActive: false },
      });
      expect(result).toEqual({ id: 'entity-1', isActive: false });
    });

    it('throws TenantIsolationError for wrong tenant', async () => {
      prisma.testModel.findUnique.mockResolvedValue({
        id: 'entity-1',
        tenantId: 'other-tenant',
      });

      await expect(repo.softDelete(tenantId, 'entity-1')).rejects.toThrow(
        TenantIsolationError
      );
    });
  });

  describe('count', () => {
    it('counts entities scoped to tenant', async () => {
      prisma.testModel.count.mockResolvedValue(42);

      const result = await repo.count(tenantId);

      expect(result).toBe(42);
      expect(prisma.testModel.count).toHaveBeenCalledWith({
        where: { tenantId, isActive: true },
      });
    });
  });
});
