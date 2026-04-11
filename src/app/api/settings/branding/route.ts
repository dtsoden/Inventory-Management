import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import {
  parseBranding,
  mergeBrandingIntoSettings,
  isValidHexColor,
  DEFAULT_BRANDING,
} from '@/lib/branding';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db';

class BrandingHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true },
    });
    const branding = parseBranding(tenant?.settings as string | null);
    return this.success(branding);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json();
    const {
      appName,
      primaryColorLight,
      primaryColorDark,
      logoUrl,
      logoUrlLight,
      logoUrlDark,
      faviconUrl,
      themeMode,
    } = body;

    if (primaryColorLight && !isValidHexColor(primaryColorLight)) {
      throw new ValidationError('Invalid light mode color. Use hex format like #7ed321.');
    }
    if (primaryColorDark && !isValidHexColor(primaryColorDark)) {
      throw new ValidationError('Invalid dark mode color. Use hex format like #7ed321.');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true, id: true },
    });
    if (!tenant) throw new NotFoundError('Tenant', ctx.tenantId);

    const currentBranding = parseBranding(tenant.settings as string | null);

    const resolvedLogoLight =
      logoUrlLight !== undefined
        ? logoUrlLight
        : logoUrl !== undefined
          ? logoUrl
          : currentBranding.logoUrlLight;
    const resolvedLogoDark =
      logoUrlDark !== undefined
        ? logoUrlDark
        : logoUrl !== undefined
          ? logoUrl
          : currentBranding.logoUrlDark;

    const resolvedThemeMode: 'auto' | 'light' | 'dark' =
      themeMode === 'light' || themeMode === 'dark' || themeMode === 'auto'
        ? themeMode
        : currentBranding.themeMode ?? DEFAULT_BRANDING.themeMode;

    const updatedBranding = {
      appName: appName ?? currentBranding.appName ?? DEFAULT_BRANDING.appName,
      logoUrlLight: resolvedLogoLight,
      logoUrlDark: resolvedLogoDark,
      primaryColorLight:
        primaryColorLight ?? currentBranding.primaryColorLight ?? DEFAULT_BRANDING.primaryColorLight,
      primaryColorDark:
        primaryColorDark ?? currentBranding.primaryColorDark ?? DEFAULT_BRANDING.primaryColorDark,
      faviconUrl: faviconUrl !== undefined ? faviconUrl : currentBranding.faviconUrl,
      themeMode: resolvedThemeMode,
    };

    const newSettings = mergeBrandingIntoSettings(
      tenant.settings as string | null,
      updatedBranding,
    );

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { settings: newSettings },
    });

    try {
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entity: 'Branding',
          details: 'Updated tenant branding settings',
        },
      });
    } catch (auditErr) {
      console.error('Audit log failed:', auditErr);
    }

    return this.success(updatedBranding);
  }
}

const handler = new BrandingHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
