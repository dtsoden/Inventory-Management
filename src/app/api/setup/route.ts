import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { ConfigService } from '@/lib/config/ConfigService';
import { mergeBrandingIntoSettings, DEFAULT_BRANDING } from '@/lib/branding';
import { insertSampleData } from '@/lib/seed/sample-data';
import { getDefaultRoles } from '@/lib/roles';

const BRANDING_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'branding');

/**
 * Persist a base64 data URL to the branding upload directory and return
 * the URL path that can be used to access it. Returns null if the data URL
 * is missing or invalid.
 */
async function saveDataUrlLogo(
  dataUrl: string | null | undefined,
  tenantId: string,
  mode: 'light' | 'dark',
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = /^data:(image\/(png|jpeg|svg\+xml|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[3];
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  };
  const ext = extMap[mime] || 'png';
  try {
    await mkdir(BRANDING_UPLOAD_DIR, { recursive: true });
    const filename = `${tenantId}-logo-${mode}-${Date.now()}.${ext}`;
    const filePath = path.join(BRANDING_UPLOAD_DIR, filename);
    await writeFile(filePath, Buffer.from(base64, 'base64'));
    return `/api/files/uploads/branding/${filename}`;
  } catch (err) {
    console.error('Failed to write setup logo:', err);
    return null;
  }
}

async function saveDataUrlFavicon(
  dataUrl: string | null | undefined,
  tenantId: string,
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  // Match common image MIME types plus ICO formats
  const match = /^data:(image\/(png|jpeg|svg\+xml|webp|x-icon|vnd\.microsoft\.icon));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[3];
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  };
  const ext = extMap[mime] || 'png';
  try {
    await mkdir(BRANDING_UPLOAD_DIR, { recursive: true });
    const filename = `${tenantId}-favicon-${Date.now()}.${ext}`;
    const filePath = path.join(BRANDING_UPLOAD_DIR, filename);
    await writeFile(filePath, Buffer.from(base64, 'base64'));
    return `/api/files/uploads/branding/${filename}`;
  } catch (err) {
    console.error('Failed to write setup favicon:', err);
    return null;
  }
}

interface SetupPayload {
  platformName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  orgName: string;
  orgSlug: string;
  openaiApiKey: string;
  openaiModel?: string;
  corsOrigins: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  catalogApiUrl?: string;
  branding?: {
    appName?: string;
    primaryColorLight?: string;
    primaryColorDark?: string;
    themeMode?: 'auto' | 'light' | 'dark';
    logoDataUrlLight?: string | null;
    logoDataUrlDark?: string | null;
    faviconDataUrl?: string | null;
  };
  seedDemoData?: boolean;
}

const REQUIRED_FIELDS: (keyof SetupPayload)[] = [
  'platformName',
  'adminEmail',
  'adminPassword',
  'adminFirstName',
  'adminLastName',
  'orgName',
  'orgSlug',
  'openaiApiKey',
  'corsOrigins',
];

// GET /api/setup - Check if setup has been completed
export async function GET() {
  try {
    const setupState = await prisma.setupState.findUnique({ where: { id: 1 } });
    return NextResponse.json({ isSetupComplete: setupState?.isSetupComplete ?? false });
  } catch {
    return NextResponse.json({ isSetupComplete: false });
  }
}

// POST /api/setup - Execute full platform setup
export async function POST(request: NextRequest) {
  try {
    // 1. Check if setup is already complete
    const existingSetup = await prisma.setupState.findUnique({ where: { id: 1 } });
    if (existingSetup?.isSetupComplete) {
      return NextResponse.json(
        { error: 'Setup has already been completed. Re-initialization is not allowed.' },
        { status: 409 },
      );
    }

    // 2. Parse and validate the request body
    const body = (await request.json()) as Partial<SetupPayload>;

    const missing = REQUIRED_FIELDS.filter((f) => !body[f] || String(body[f]).trim() === '');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const payload = body as SetupPayload;

    // 3. Read VAULT_KEY from environment
    const vaultKeyHex = process.env.VAULT_KEY;
    if (!vaultKeyHex || vaultKeyHex.length < 32) {
      return NextResponse.json(
        { error: 'VAULT_KEY environment variable is not set. Generate one with: openssl rand -hex 32' },
        { status: 400 },
      );
    }
    const vaultKey = Buffer.from(vaultKeyHex, 'hex');
    const encryption = new EncryptionService();
    const keyHash = encryption.hashForVerification(vaultKey);

    // 4. Create SetupState record with key hash for verification
    await prisma.setupState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        isSetupComplete: false,
        encryptionSalt: '',
        adminPasswordHash: keyHash,
      },
      update: {
        encryptionSalt: '',
        adminPasswordHash: keyHash,
      },
    });

    // 5. Store config values via ConfigService
    const configService = new ConfigService(prisma, encryption);
    configService.setVaultKey(vaultKey);

    await configService.set('platform_name', payload.platformName, {
      isSecret: false,
      category: 'platform',
      description: 'Name of the platform',
    });

    await configService.set('openai_api_key', payload.openaiApiKey, {
      isSecret: true,
      category: 'integrations',
      description: 'OpenAI API key for AI features',
    });

    await configService.set('openai_model', payload.openaiModel || 'gpt-5.4-nano', {
      isSecret: false,
      category: 'integrations',
      description: 'Default OpenAI model for AI features',
    });

    await configService.set('cors_origins', payload.corsOrigins, {
      isSecret: false,
      category: 'security',
      description: 'Allowed CORS origins (comma-separated)',
    });

    // Store optional SMTP settings if provided
    if (payload.smtpHost) {
      await configService.set('smtp_host', payload.smtpHost, {
        isSecret: false,
        category: 'email',
        description: 'SMTP server hostname',
      });
    }
    if (payload.smtpPort) {
      await configService.set('smtp_port', payload.smtpPort, {
        isSecret: false,
        category: 'email',
        description: 'SMTP server port',
      });
    }
    if (payload.smtpUser) {
      await configService.set('smtp_user', payload.smtpUser, {
        isSecret: false,
        category: 'email',
        description: 'SMTP username',
      });
    }
    if (payload.smtpPassword) {
      await configService.set('smtp_password', payload.smtpPassword, {
        isSecret: true,
        category: 'email',
        description: 'SMTP password',
      });
    }
    if (payload.smtpFrom) {
      await configService.set('smtp_from', payload.smtpFrom, {
        isSecret: false,
        category: 'email',
        description: 'Default sender email address',
      });
    }
    if (payload.catalogApiUrl) {
      await configService.set('catalog_api_url', payload.catalogApiUrl, {
        isSecret: false,
        category: 'integrations',
        description: 'External catalog API URL',
      });
    }

    // 6. Create Tenant with branding settings
    const themeMode: 'auto' | 'light' | 'dark' =
      payload.branding?.themeMode === 'light' ||
      payload.branding?.themeMode === 'dark' ||
      payload.branding?.themeMode === 'auto'
        ? payload.branding.themeMode
        : DEFAULT_BRANDING.themeMode;

    const initialBranding = {
      ...DEFAULT_BRANDING,
      appName: payload.branding?.appName || DEFAULT_BRANDING.appName,
      primaryColorLight: payload.branding?.primaryColorLight || DEFAULT_BRANDING.primaryColorLight,
      primaryColorDark: payload.branding?.primaryColorDark || DEFAULT_BRANDING.primaryColorDark,
      themeMode,
    };
    const initialSettingsJson = mergeBrandingIntoSettings(null, initialBranding);

    const tenant = await prisma.tenant.create({
      data: {
        name: payload.orgName,
        slug: payload.orgSlug,
        settings: initialSettingsJson,
        isActive: true,
      },
    });

    // Persist any uploaded logos now that we know the tenant id, then
    // update the tenant settings with the resolved logo URLs.
    const logoUrlLight = await saveDataUrlLogo(
      payload.branding?.logoDataUrlLight,
      tenant.id,
      'light',
    );
    const logoUrlDark = await saveDataUrlLogo(
      payload.branding?.logoDataUrlDark,
      tenant.id,
      'dark',
    );
    const faviconUrl = await saveDataUrlFavicon(
      payload.branding?.faviconDataUrl,
      tenant.id,
    );

    if (logoUrlLight || logoUrlDark || faviconUrl) {
      const finalBranding = {
        ...initialBranding,
        logoUrlLight: logoUrlLight ?? initialBranding.logoUrlLight,
        logoUrlDark: logoUrlDark ?? initialBranding.logoUrlDark,
        faviconUrl: faviconUrl ?? initialBranding.faviconUrl,
      };
      const finalSettingsJson = mergeBrandingIntoSettings(
        initialSettingsJson,
        finalBranding,
      );
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { settings: finalSettingsJson },
      });
    }

    // 7. Create admin User with bcrypt-hashed password
    const hashedPassword = await hash(payload.adminPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: payload.adminEmail,
        name: `${payload.adminFirstName} ${payload.adminLastName}`,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // 7b. Seed demo data if requested
    if (payload.seedDemoData) {
      try {
        await insertSampleData(prisma, tenant.id, adminUser.id);
        console.log('Sample data seeded successfully.');
      } catch (seedError) {
        console.error('Sample data seeding failed (non-fatal):', seedError);
      }
    }

    // 7c. Seed the canonical role definitions into SystemConfig so the
    // Roles tab in /settings/users has a non-empty list from minute zero,
    // including PURCHASING_MANAGER and any future default roles. The
    // /api/settings/roles loader has self-healing reconciliation as a
    // safety net, but seeding here means a fresh tenant never has to
    // wait for someone to visit the Roles tab to materialize defaults.
    try {
      const existingRolesConfig = await prisma.systemConfig.findUnique({
        where: { key: 'custom_roles' },
      });
      if (!existingRolesConfig) {
        await prisma.systemConfig.create({
          data: {
            key: 'custom_roles',
            value: JSON.stringify(getDefaultRoles()),
            category: 'roles',
            description: 'Role definitions and per-role permissions',
          },
        });
        console.log('Default roles seeded into SystemConfig.');
      }
    } catch (roleSeedError) {
      console.error('Default role seeding failed (non-fatal):', roleSeedError);
    }

    // 8. Generate NEXTAUTH_SECRET and store unencrypted so start.sh can
    // read it from SQLite and export it before the app boots. The signing
    // key is useless without the running server, so plaintext storage in
    // the DB is acceptable.
    const nextAuthSecret = randomBytes(32).toString('base64');
    await prisma.systemConfig.upsert({
      where: { key: 'nextauth_secret' },
      create: {
        key: 'nextauth_secret',
        value: nextAuthSecret,
        isSecret: false,
        category: 'auth',
        description: 'NextAuth.js secret for session signing',
      },
      update: { value: nextAuthSecret },
    });

    // 9. Mark setup as complete
    await prisma.setupState.update({
      where: { id: 1 },
      data: { isSetupComplete: true },
    });

    // 10. Clear cached auth secret so the app picks up the real one
    const { clearAuthSecretCache } = await import('@/lib/auth-secret');
    clearAuthSecretCache();

    // Clean up the vault key from memory
    configService.lockVault();

    return NextResponse.json(
      { success: true, message: 'Platform setup completed successfully.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json(
      { error: 'Setup failed. Check server logs for details.' },
      { status: 500 },
    );
  }
}
