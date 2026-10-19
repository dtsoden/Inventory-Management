import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';
import { smtpSettingsService } from '@/lib/email/SmtpSettingsService';
import { getConfigService } from '@/lib/config/vault';
import { ValidationError } from '@/lib/errors';

const systemConfigRepo = new SystemConfigRepository(prisma);

async function setConfig(
  key: string,
  value: string,
  category: string,
  description: string,
  isSecret = false,
): Promise<void> {
  await systemConfigRepo.upsert({ key, value, isSecret, category, description });
}

async function getConfigValue(key: string): Promise<string | null> {
  const row = await systemConfigRepo.findByKey(key);
  return row?.value ?? null;
}

async function getConfigsByKeys(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const v = await getConfigValue(key);
    if (v !== null) result[key] = v;
  }
  return result;
}

class IntegrationsHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const category = req.nextUrl.searchParams.get('category') || 'integrations';

    if (category === 'org') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, slug: true },
      });
      const platformName = (await getConfigValue('platform_name')) || 'Inventory Management';
      return this.success({
        tenantName: tenant?.name || '',
        tenantSlug: tenant?.slug || '',
        platformName,
      });
    }

    if (category === 'security') {
      const corsOrigins = (await getConfigValue('cors_origins')) || '';
      const sessionTimeout = (await getConfigValue('session_timeout')) || '480';
      return this.success({ corsOrigins, sessionTimeout });
    }

    if (category === 'smtp_check') {
      return this.success({ smtpConfigured: await smtpSettingsService.isConfigured() });
    }

    if (category === 'smtp') {
      return this.success(await smtpSettingsService.getView());
    }

    if (category === 'password_policy') {
      const map = await getConfigsByKeys([
        'pw_min_length',
        'pw_require_uppercase',
        'pw_require_lowercase',
        'pw_require_numbers',
        'pw_require_special',
      ]);
      return this.success({
        minLength: map['pw_min_length'] || '8',
        requireUppercase: map['pw_require_uppercase'] || 'true',
        requireLowercase: map['pw_require_lowercase'] || 'true',
        requireNumbers: map['pw_require_numbers'] || 'true',
        requireSpecialChars: map['pw_require_special'] || 'false',
      });
    }

    // Default: integrations category
    const openaiKey = await getConfigValue('openai_api_key');
    const catalogApiUrl = (await getConfigValue('catalog_api_url')) || '';
    const openaiModel = (await getConfigValue('openai_model')) || 'gpt-5.4-nano';

    let openaiKeyMasked = '';
    if (openaiKey) {
      openaiKeyMasked =
        openaiKey.length > 11
          ? openaiKey.slice(0, 7) + '...' + openaiKey.slice(-4)
          : '\u2022'.repeat(8);
    }

    return this.success({ openaiKeyMasked, openaiModel, catalogApiUrl });
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const { category, settings } = await req.json();

    if (category === 'org') {
      if (settings.tenantName || settings.tenantSlug) {
        const updateData: Record<string, string> = {};
        if (settings.tenantName) updateData.name = settings.tenantName;
        if (settings.tenantSlug) updateData.slug = settings.tenantSlug;
        await prisma.tenant.update({
          where: { id: ctx.tenantId },
          data: updateData,
        });
      }
      if (settings.platformName) {
        await setConfig('platform_name', settings.platformName, 'platform', 'Platform display name');
      }
      await this.audit(ctx, 'Updated organization settings');
      return this.success(null);
    }

    if (category === 'security') {
      if (settings.corsOrigins !== undefined) {
        await setConfig('cors_origins', settings.corsOrigins, 'cors', 'Allowed CORS origins');
      }
      if (settings.sessionTimeout !== undefined) {
        await setConfig(
          'session_timeout',
          settings.sessionTimeout,
          'platform',
          'Session timeout in minutes',
        );
      }
      await this.audit(ctx, 'Updated security settings');
      return this.success(null);
    }

    if (category === 'password_policy') {
      const policyFields: Record<string, string> = {
        pw_min_length: settings.minLength || '8',
        pw_require_uppercase: settings.requireUppercase || 'true',
        pw_require_lowercase: settings.requireLowercase || 'true',
        pw_require_numbers: settings.requireNumbers || 'true',
        pw_require_special: settings.requireSpecialChars || 'false',
      };
      for (const [key, value] of Object.entries(policyFields)) {
        await setConfig(key, value, 'password_policy', `Password policy: ${key}`);
      }
      await this.audit(ctx, 'Updated password policy');
      return this.success(null);
    }

    if (category === 'smtp') {
      await smtpSettingsService.save(settings);
      await this.audit(ctx, 'Updated SMTP email settings');
      return this.success(null);
    }

    // Default: integrations category
    if (settings.openaiApiKey) {
      // Secrets must go through the vault so readers can decrypt them.
      const vault = getConfigService();
      if (!vault) throw new ValidationError('VAULT_KEY is not set, so the API key cannot be stored.');
      await vault.set('openai_api_key', String(settings.openaiApiKey).trim(), {
        isSecret: true,
        category: 'ai',
        description: 'OpenAI API key',
      });
    }
    if (settings.openaiModel !== undefined) {
      await setConfig(
        'openai_model',
        settings.openaiModel,
        'ai',
        'Selected OpenAI model for AI assistant',
      );
    }
    if (settings.catalogApiUrl !== undefined) {
      await setConfig(
        'catalog_api_url',
        settings.catalogApiUrl,
        'integrations',
        'External catalog API URL',
      );
    }
    await this.audit(ctx, 'Updated integration settings');
    return this.success(null);
  }

  private async audit(ctx: TenantContext, details: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'Settings',
        details,
      },
    });
  }
}

const handler = new IntegrationsHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
