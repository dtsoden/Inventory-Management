import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from './ConfigService';
import { EncryptionService } from '../encryption/EncryptionService';

// Mock Prisma client with systemConfig methods
function createMockPrisma() {
  return {
    systemConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('ConfigService', () => {
  let service: ConfigService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let encryption: EncryptionService;
  const testKey = Buffer.alloc(32, 'a');

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    encryption = new EncryptionService();
    service = new ConfigService(mockPrisma as any, encryption);
  });

  describe('get()', () => {
    it('returns decrypted value for secret config', async () => {
      const encryptedValue = encryption.encrypt('my-secret-api-key', testKey);
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'api_key',
        value: encryptedValue,
        isSecret: true,
        category: 'integrations',
      });

      service.setVaultKey(Buffer.from(testKey));
      const result = await service.get('api_key');

      expect(result).toBe('my-secret-api-key');
      expect(mockPrisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'api_key' },
      });
    });

    it('returns plaintext for non-secret config', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'site_name',
        value: 'My Inventory',
        isSecret: false,
        category: 'platform',
      });

      const result = await service.get('site_name');

      expect(result).toBe('My Inventory');
    });

    it('returns null for missing config', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

      const result = await service.get('nonexistent_key');

      expect(result).toBeNull();
    });

    it('throws when vault is locked and config is secret', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'api_key',
        value: 'encrypted-data',
        isSecret: true,
        category: 'integrations',
      });

      await expect(service.get('api_key')).rejects.toThrow(
        'Vault is locked. Provide the encryption passphrase to unlock.',
      );
    });
  });

  describe('set()', () => {
    it('encrypts secret values before storage', async () => {
      mockPrisma.systemConfig.upsert.mockResolvedValue({});
      service.setVaultKey(Buffer.from(testKey));

      await service.set('api_key', 'my-secret', {
        isSecret: true,
        category: 'integrations',
        description: 'API key',
      });

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(1);
      const call = mockPrisma.systemConfig.upsert.mock.calls[0][0];
      // The stored value should NOT be the plaintext
      expect(call.create.value).not.toBe('my-secret');
      expect(call.update.value).not.toBe('my-secret');
      // Verify we can decrypt the stored value back
      const decrypted = encryption.decrypt(call.create.value, testKey);
      expect(decrypted).toBe('my-secret');
    });

    it('stores non-secret values as plaintext', async () => {
      mockPrisma.systemConfig.upsert.mockResolvedValue({});

      await service.set('site_name', 'My Inventory', {
        isSecret: false,
        category: 'platform',
      });

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(1);
      const call = mockPrisma.systemConfig.upsert.mock.calls[0][0];
      expect(call.create.value).toBe('My Inventory');
      expect(call.update.value).toBe('My Inventory');
      expect(call.create.isSecret).toBe(false);
      expect(call.create.category).toBe('platform');
    });
  });

  describe('getByCategory()', () => {
    it('returns all configs with secrets decrypted', async () => {
      const encryptedValue = encryption.encrypt('secret-value', testKey);
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'api_key', value: encryptedValue, isSecret: true, category: 'integrations' },
        { key: 'api_url', value: 'https://api.example.com', isSecret: false, category: 'integrations' },
      ]);

      service.setVaultKey(Buffer.from(testKey));
      const result = await service.getByCategory('integrations');

      expect(result).toEqual({
        api_key: 'secret-value',
        api_url: 'https://api.example.com',
      });
      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledWith({
        where: { category: 'integrations' },
      });
    });
  });

  describe('vault management', () => {
    it('reports vault as locked by default', () => {
      expect(service.isVaultUnlocked()).toBe(false);
    });

    it('reports vault as unlocked after setting key', () => {
      service.setVaultKey(Buffer.from(testKey));
      expect(service.isVaultUnlocked()).toBe(true);
    });

    it('locks vault and zeroes key memory', () => {
      const key = Buffer.alloc(32, 'b');
      service.setVaultKey(key);
      service.lockVault();
      expect(service.isVaultUnlocked()).toBe(false);
      // Key buffer should be zeroed
      expect(key.every((byte) => byte === 0)).toBe(true);
    });
  });
});
