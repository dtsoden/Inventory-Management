import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';

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
      const platformName = (await getConfigValue('platform_name')) || 'Shane Inventory';
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
      const smtpHost = await getConfigValue('smtp_host');
      return this.success({ smtpConfigured: !!smtpHost });
    }

    if (category === 'smtp') {
      const map = await getConfigsByKeys([
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_password',
        'smtp_from',
      ]);

      let maskedPassword = '';
      if (map['smtp_password']) {
        maskedPassword =
          map['smtp_password'].length > 4
            ? '\u2022'.repeat(map['smtp_password'].length - 4) + map['smtp_password'].slice(-4)
            : '\u2022'.repeat(8);
      }

      return this.success({
        smtp_host: map['smtp_host'] || '',
        smtp_port: map['smtp_port'] || '587',
        smtp_user: map['smtp_user'] || '',
        smtp_password: maskedPassword,
        smtp_from: map['smtp_from'] || '',
      });
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
      const smtpFields: Record<string, string> = {
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || '587',
        smtp_user: settings.smtp_user || '',
        smtp_password: settings.smtp_password || '',
        smtp_from: settings.smtp_from || '',
      };
      for (const [key, value] of Object.entries(smtpFields)) {
        // Skip writing the password if it's a masked display value.
        if (key === 'smtp_password' && value.includes('\u2022')) continue;
        await setConfig(
          key,
          value,
          'email',
          `SMTP setting: ${key}`,
          key === 'smtp_password',
        );
      }
      await this.audit(ctx, 'Updated SMTP email settings');
      return this.success(null);
    }

    // Default: integrations category
    if (settings.openaiApiKey) {
      await setConfig('openai_api_key', settings.openaiApiKey, 'ai', 'OpenAI API key', true);
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
