import { prisma } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { ConfigService } from './ConfigService';

let _configService: ConfigService | null = null;
let _initAttempted = false;

function initVault(): ConfigService | null {
  if (_initAttempted) return _configService;
  _initAttempted = true;

  try {
    const keyHex = process.env.VAULT_KEY;
    if (!keyHex) {
      console.error('[vault] VAULT_KEY is not set; encrypted settings cannot be read.');
      return null;
    }

    const key = Buffer.from(keyHex, 'hex');
    const encryption = new EncryptionService();
    const svc = new ConfigService(prisma, encryption);
    svc.setVaultKey(key);
    _configService = svc;
    return svc;
  } catch {
    return null;
  }
}

/** The vault-backed ConfigService, or null when VAULT_KEY is not set. */
export function getConfigService(): ConfigService | null {
  return initVault();
}

export async function getVaultSecret(key: string): Promise<string | null> {
  const svc = initVault();
  if (!svc) return null;
  try {
    return await svc.get(key);
  } catch (err) {
    console.error(`[vault] Could not read "${key}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getOpenAIKey(): Promise<string | null> {
  return getVaultSecret('openai_api_key');
}

export async function getOpenAIModel(): Promise<string> {
  const svc = initVault();
  if (svc) {
    try {
      const model = await svc.get('openai_model');
      if (model) return model;
    } catch { /* fall through */ }
  }
  return 'gpt-4o';
}
