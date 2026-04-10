import type { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../encryption/EncryptionService';

interface SetConfigOptions {
  isSecret: boolean;
  category: string;
  description?: string;
}

export class ConfigService {
  private vaultKey: Buffer | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryption: EncryptionService,
  ) {}

  setVaultKey(key: Buffer): void { this.vaultKey = key; }
  isVaultUnlocked(): boolean { return this.vaultKey !== null; }
  lockVault(): void {
    if (this.vaultKey) { this.vaultKey.fill(0); this.vaultKey = null; }
  }

  async get(key: string): Promise<string | null> {
    const config = await (this.prisma as any).systemConfig.findUnique({ where: { key } });
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
    await (this.prisma as any).systemConfig.upsert({
      where: { key },
      create: { key, value: storedValue, isSecret: options.isSecret, category: options.category, description: options.description },
      update: { value: storedValue, isSecret: options.isSecret, category: options.category, description: options.description },
    });
  }

  async getByCategory(category: string): Promise<Record<string, string>> {
    const configs = await (this.prisma as any).systemConfig.findMany({ where: { category } });
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
    await (this.prisma as any).systemConfig.delete({ where: { key } });
  }

  private requireVaultKey(): void {
    if (!this.vaultKey) throw new Error('Vault is locked. Provide the encryption passphrase to unlock.');
  }
}
