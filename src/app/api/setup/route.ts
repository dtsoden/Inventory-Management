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

interface SetupPayload {
  passphrase: string;
  platformName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  orgName: string;
  orgSlug: string;
  openaiApiKey: string;
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
  };
  seedDemoData?: boolean;
}

const REQUIRED_FIELDS: (keyof SetupPayload)[] = [
  'passphrase',
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

    // 3. Derive encryption key from passphrase
    const encryption = new EncryptionService();
    const salt = EncryptionService.generateSalt();
    const derivedKey = await encryption.deriveKey(payload.passphrase, salt);
    const keyHash = encryption.hashForVerification(derivedKey);

    // 4. Create SetupState record with salt and key hash
    await prisma.setupState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        isSetupComplete: false,
        encryptionSalt: salt,
        adminPasswordHash: keyHash,
      },
      update: {
        encryptionSalt: salt,
        adminPasswordHash: keyHash,
      },
    });

    // 5. Store config values via ConfigService
    const configService = new ConfigService(prisma, encryption);
    configService.setVaultKey(derivedKey);

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

    if (logoUrlLight || logoUrlDark) {
      const finalBranding = {
        ...initialBranding,
        logoUrlLight: logoUrlLight ?? initialBranding.logoUrlLight,
        logoUrlDark: logoUrlDark ?? initialBranding.logoUrlDark,
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

    // 8. Generate NEXTAUTH_SECRET if not set in environment
    const nextAuthSecret = process.env.NEXTAUTH_SECRET || randomBytes(32).toString('base64');
    await configService.set('nextauth_secret', nextAuthSecret, {
      isSecret: true,
      category: 'auth',
      description: 'NextAuth.js secret for session signing',
    });

    // 9. Mark setup as complete
    await prisma.setupState.update({
      where: { id: 1 },
      data: { isSetupComplete: true },
    });

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
