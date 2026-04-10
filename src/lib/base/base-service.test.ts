import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from './BaseRepository';
import { BaseService } from './BaseService';
import { TenantContext } from '@/lib/types';

// Concrete implementations for testing
class TestRepository extends BaseRepository<any> {
  protected get modelName(): string {
    return 'testModel';
  }
}

class TestService extends BaseService<any> {
  protected get entityName(): string {
    return 'TestEntity';
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
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('BaseService', () => {
  let service: TestService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const ctx: TenantContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    role: 'ADMIN',
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    const repository = new TestRepository(prisma);
    service = new TestService(repository, prisma);
  });

  describe('create', () => {
    it('creates entity and logs audit event', async () => {
      const data = { name: 'Widget' };
      const created = { id: 'new-1', tenantId: ctx.tenantId, ...data };
      prisma.testModel.create.mockResolvedValue(created);

      const result = await service.create(ctx, data);

      expect(result).toEqual(created);
      expect(prisma.testModel.create).toHaveBeenCalledWith({
        data: { ...data, tenantId: ctx.tenantId },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'TestEntity',
          entityId: 'new-1',
        }),
      });
    });
  });

  describe('update', () => {
    it('logs before and after state in audit', async () => {
      const before = {
        id: 'entity-1',
        tenantId: ctx.tenantId,
        name: 'Old Name',
      };
      const after = {
        id: 'entity-1',
        tenantId: ctx.tenantId,
        name: 'New Name',
      };

      // findById (getByIdOrThrow) uses findFirst
      prisma.testModel.findFirst.mockResolvedValue(before);
      // verifyTenantOwnership uses findUnique
      prisma.testModel.findUnique.mockResolvedValue({
        id: 'entity-1',
        tenantId: ctx.tenantId,
      });
      prisma.testModel.update.mockResolvedValue(after);

      const result = await service.update(ctx, 'entity-1', {
        name: 'New Name',
      });

      expect(result).toEqual(after);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entityId: 'entity-1',
          details: expect.stringContaining('"before"'),
        }),
      });

      // Verify the details contain both before and after
      const auditCall = prisma.auditLog.create.mock.calls[0][0];
      const details = JSON.parse(auditCall.data.details);
      expect(details.before).toEqual(before);
      expect(details.after).toEqual(after);
    });
  });

  describe('getById', () => {
    it('returns entity without logging an audit event', async () => {
      const entity = {
        id: 'entity-1',
        tenantId: ctx.tenantId,
        name: 'Widget',
      };
      prisma.testModel.findFirst.mockResolvedValue(entity);

      const result = await service.getById(ctx, 'entity-1');

      expect(result).toEqual(entity);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
