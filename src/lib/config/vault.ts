import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { ConfigService } from './ConfigService';

const VAULT_KEY_PATH = path.join(process.cwd(), 'data', '.vault-key');

let _configService: ConfigService | null = null;
let _initAttempted = false;

function initVault(): ConfigService | null {
  if (_initAttempted) return _configService;
  _initAttempted = true;

  try {
    let keyHex: string | undefined;

    if (process.env.VAULT_KEY) {
      keyHex = process.env.VAULT_KEY;
    } else if (existsSync(VAULT_KEY_PATH)) {
      keyHex = readFileSync(VAULT_KEY_PATH, 'utf-8').trim();
    }

    if (!keyHex) return null;

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

export async function getVaultSecret(key: string): Promise<string | null> {
  const svc = initVault();
  if (!svc) return null;
  try {
    return await svc.get(key);
  } catch {
    return null;
  }
}

export async function getOpenAIKey(): Promise<string | null> {
  const fromVault = await getVaultSecret('openai_api_key');
  if (fromVault) return fromVault;
  return process.env.OPENAI_API_KEY || null;
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
