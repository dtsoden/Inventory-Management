import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can view settings');
    }

    const category = req.nextUrl.searchParams.get('category') || 'integrations';

    if (category === 'org') {
      // Return tenant info
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true, slug: true },
      });

      const platformConfig = await prisma.systemConfig.findUnique({
        where: { key: 'platform_name' },
      });

      const body: ApiResponse = {
        success: true,
        data: {
          tenantName: tenant?.name || '',
          tenantSlug: tenant?.slug || '',
          platformName: platformConfig?.value || 'Shane Inventory',
        },
      };
      return NextResponse.json(body);
    }

    if (category === 'security') {
      const corsConfig = await prisma.systemConfig.findUnique({
        where: { key: 'cors_origins' },
      });
      const sessionConfig = await prisma.systemConfig.findUnique({
        where: { key: 'session_timeout' },
      });

      const body: ApiResponse = {
        success: true,
        data: {
          corsOrigins: corsConfig?.value || '',
          sessionTimeout: sessionConfig?.value || '480',
        },
      };
      return NextResponse.json(body);
    }

    // Integrations category
    const openaiConfig = await prisma.systemConfig.findUnique({
      where: { key: 'openai_api_key' },
    });

    const catalogConfig = await prisma.systemConfig.findUnique({
      where: { key: 'catalog_api_url' },
    });

    // Mask the API key for display
    let openaiKeyMasked = '';
    if (openaiConfig?.value) {
      const val = openaiConfig.value;
      if (val.length > 11) {
        openaiKeyMasked = val.slice(0, 7) + '...' + val.slice(-4);
      } else {
        openaiKeyMasked = '••••••••';
      }
    }

    const body: ApiResponse = {
      success: true,
      data: {
        openaiKeyMasked,
        catalogApiUrl: catalogConfig?.value || '',
      },
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/settings/integrations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can update settings');
    }

    const { category, settings } = await req.json();

    if (category === 'org') {
      // Update tenant info
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
        await prisma.systemConfig.upsert({
          where: { key: 'platform_name' },
          create: {
            key: 'platform_name',
            value: settings.platformName,
            category: 'platform',
            description: 'Platform display name',
          },
          update: { value: settings.platformName },
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entity: 'Settings',
          details: 'Updated organization settings',
        },
      });

      return NextResponse.json({ success: true });
    }

    if (category === 'security') {
      if (settings.corsOrigins !== undefined) {
        await prisma.systemConfig.upsert({
          where: { key: 'cors_origins' },
          create: {
            key: 'cors_origins',
            value: settings.corsOrigins,
            category: 'cors',
            description: 'Allowed CORS origins',
          },
          update: { value: settings.corsOrigins },
        });
      }

      if (settings.sessionTimeout !== undefined) {
        await prisma.systemConfig.upsert({
          where: { key: 'session_timeout' },
          create: {
            key: 'session_timeout',
            value: settings.sessionTimeout,
            category: 'platform',
            description: 'Session timeout in minutes',
          },
          update: { value: settings.sessionTimeout },
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entity: 'Settings',
          details: 'Updated security settings',
        },
      });

      return NextResponse.json({ success: true });
    }

    // Integrations category
    if (settings.openaiApiKey) {
      await prisma.systemConfig.upsert({
        where: { key: 'openai_api_key' },
        create: {
          key: 'openai_api_key',
          value: settings.openaiApiKey,
          isSecret: true,
          category: 'ai',
          description: 'OpenAI API key',
        },
        update: { value: settings.openaiApiKey },
      });
    }

    if (settings.catalogApiUrl !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'catalog_api_url' },
        create: {
          key: 'catalog_api_url',
          value: settings.catalogApiUrl,
          category: 'integrations',
          description: 'External catalog API URL',
        },
        update: { value: settings.catalogApiUrl },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'Settings',
        details: 'Updated integration settings',
      },
    });

    const body: ApiResponse = { success: true };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in PUT /api/settings/integrations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
