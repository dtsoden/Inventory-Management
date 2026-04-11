import type { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../encryption/EncryptionService';
import { SystemConfigRepository } from './SystemConfigRepository';

interface SetConfigOptions {
  isSecret: boolean;
  category: string;
  description?: string;
}

/**
 * The single source of truth for SystemConfig reads and writes across
 * the application. Encrypts secrets via EncryptionService when the
 * vault is unlocked. Delegates all DB access to SystemConfigRepository
 * so the prisma layer stays encapsulated.
 */
export class ConfigService {
  private vaultKey: Buffer | null = null;
  private readonly repo: SystemConfigRepository;

  constructor(
    prisma: PrismaClient,
    private readonly encryption: EncryptionService,
  ) {
    this.repo = new SystemConfigRepository(prisma);
  }

  setVaultKey(key: Buffer): void {
    this.vaultKey = key;
  }

  isVaultUnlocked(): boolean {
    return this.vaultKey !== null;
  }

  lockVault(): void {
    if (this.vaultKey) {
      this.vaultKey.fill(0);
      this.vaultKey = null;
    }
  }

  async get(key: string): Promise<string | null> {
    const config = await this.repo.findByKey(key);
    if (!config) return null;
    if (config.isSecret) {
      this.requireVaultKey();
      return this.encryption.decrypt(config.value, this.vaultKey!);
    }
    return config.value;
  }

  async set(key: string, value: string, options: SetConfigOptions): Promise<void> {
    let storedValue = value;
    if (options.isSecret) {
      this.requireVaultKey();
      storedValue = this.encryption.encrypt(value, this.vaultKey!);
    }
    await this.repo.upsert({
      key,
      value: storedValue,
      isSecret: options.isSecret,
      category: options.category,
      description: options.description ?? null,
    });
  }

  async getByCategory(category: string): Promise<Record<string, string>> {
    const configs = await this.repo.findByCategory(category);
    const result: Record<string, string> = {};
    for (const config of configs) {
      if (config.isSecret) {
        this.requireVaultKey();
        result[config.key] = this.encryption.decrypt(config.value, this.vaultKey!);
      } else {
        result[config.key] = config.value;
      }
    }
    return result;
  }

  async delete(key: string): Promise<void> {
    await this.repo.deleteByKey(key);
  }

  private requireVaultKey(): void {
    if (!this.vaultKey) {
      throw new Error('Vault is locked. Provide the encryption passphrase to unlock.');
    }
  }
}
