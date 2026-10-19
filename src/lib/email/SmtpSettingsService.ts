import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';
import { getConfigService } from '@/lib/config/vault';
import { ValidationError } from '@/lib/errors';

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

/** What the settings page sees. The password never leaves the server. */
export interface SmtpSettingsView {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  passwordSet: boolean;
}

/** Form input. An empty or omitted password keeps the stored one. */
export interface SmtpSettingsInput {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
}

const KEYS = {
  host: 'smtp_host',
  port: 'smtp_port',
  user: 'smtp_user',
  password: 'smtp_password',
  from: 'smtp_from',
} as const;

const CATEGORY = 'email';
const DEFAULT_PORT = 587;

/**
 * The one place the global SMTP configuration is read and written.
 * Every outbound email (purchase orders, password resets, notification
 * emails, the settings-page test) gets its settings from here, so the
 * password is always stored encrypted in the vault and always decrypted
 * the same way.
 */
export class SmtpSettingsService {
  private readonly repo: SystemConfigRepository;

  constructor(private readonly prisma: PrismaClient = defaultPrisma) {
    this.repo = new SystemConfigRepository(prisma);
  }

  async isConfigured(): Promise<boolean> {
    const host = await this.repo.findByKey(KEYS.host);
    return !!host?.value?.trim();
  }

  async getSettings(): Promise<SmtpSettings | null> {
    const [host, port, user, from] = await Promise.all([
      this.readPlain(KEYS.host),
      this.readPlain(KEYS.port),
      this.readPlain(KEYS.user),
      this.readPlain(KEYS.from),
    ]);
    if (!host) return null;
    return {
      host,
      port: this.parsePort(port),
      user,
      password: await this.readPassword(),
      from,
    };
  }

  async getView(): Promise<SmtpSettingsView> {
    const [host, port, user, from, passwordRow] = await Promise.all([
      this.readPlain(KEYS.host),
      this.readPlain(KEYS.port),
      this.readPlain(KEYS.user),
      this.readPlain(KEYS.from),
      this.repo.findByKey(KEYS.password),
    ]);
    return {
      smtp_host: host,
      smtp_port: port || String(DEFAULT_PORT),
      smtp_user: user,
      smtp_from: from,
      passwordSet: !!passwordRow?.value,
    };
  }

  async save(input: SmtpSettingsInput): Promise<void> {
    const port = (input.smtp_port ?? '').trim() || String(DEFAULT_PORT);
    this.parsePort(port);

    await this.writePlain(KEYS.host, (input.smtp_host ?? '').trim(), 'SMTP server hostname');
    await this.writePlain(KEYS.port, port, 'SMTP server port');
    await this.writePlain(KEYS.user, (input.smtp_user ?? '').trim(), 'SMTP username');
    await this.writePlain(KEYS.from, (input.smtp_from ?? '').trim(), 'Default sender email address');

    if (input.smtp_password) {
      await this.writePassword(input.smtp_password);
    }
  }

  /**
   * Merge unsaved form values over the stored settings, so the test
   * button checks exactly what is on screen. A blank password falls
   * back to the stored one.
   */
  async resolve(input?: SmtpSettingsInput): Promise<SmtpSettings> {
    const stored = await this.getSettings();
    const host = (input?.smtp_host ?? stored?.host ?? '').trim();
    if (!host) {
      throw new ValidationError('SMTP is not configured. Enter an SMTP host in Settings > Integrations > Email.');
    }
    return {
      host,
      port: input?.smtp_port !== undefined ? this.parsePort(input.smtp_port) : stored?.port ?? DEFAULT_PORT,
      user: (input?.smtp_user ?? stored?.user ?? '').trim(),
      password: input?.smtp_password || stored?.password || '',
      from: (input?.smtp_from ?? stored?.from ?? '').trim(),
    };
  }

  // ----- internals -----

  private parsePort(value: string | undefined | null): number {
    const raw = (value ?? '').trim();
    if (!raw) return DEFAULT_PORT;
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ValidationError(`SMTP port "${raw}" is not a valid port number`);
    }
    return port;
  }

  private async readPlain(key: string): Promise<string> {
    const row = await this.repo.findByKey(key);
    return row?.value ?? '';
  }

  private async writePlain(key: string, value: string, description: string): Promise<void> {
    await this.repo.upsert({ key, value, isSecret: false, category: CATEGORY, description });
  }

  private async readPassword(): Promise<string> {
    const row = await this.repo.findByKey(KEYS.password);
    if (!row?.value) return '';
    if (!row.isSecret) {
      await this.writePassword(row.value);
      return row.value;
    }
    try {
      return (await this.requireVault().get(KEYS.password)) ?? '';
    } catch {
      throw new ValidationError(
        'The stored SMTP password cannot be decrypted with the current VAULT_KEY. Re-enter it in Settings > Integrations > Email.',
      );
    }
  }

  private async writePassword(password: string): Promise<void> {
    await this.requireVault().set(KEYS.password, password, {
      isSecret: true,
      category: CATEGORY,
      description: 'SMTP password',
    });
  }

  private requireVault() {
    const config = getConfigService();
    if (!config) {
      throw new ValidationError('VAULT_KEY is not set, so the SMTP password cannot be stored or read.');
    }
    return config;
  }
}

export const smtpSettingsService = new SmtpSettingsService();
