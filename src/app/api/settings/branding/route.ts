import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import {
  parseBranding,
  mergeBrandingIntoSettings,
  isValidHexColor,
  DEFAULT_BRANDING,
} from '@/lib/branding';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true },
    });

    const branding = parseBranding(tenant?.settings as string | null);

    const body: ApiResponse = { success: true, data: branding };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/settings/branding error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can update branding');
    }

    const body = await req.json();
    const {
      appName,
      primaryColorLight,
      primaryColorDark,
      logoUrl,
      faviconUrl,
    } = body;

    // Validate colors if provided
    if (primaryColorLight && !isValidHexColor(primaryColorLight)) {
      return NextResponse.json(
        { success: false, error: 'Invalid light mode color. Use hex format like #7ed321.' },
        { status: 400 },
      );
    }
    if (primaryColorDark && !isValidHexColor(primaryColorDark)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dark mode color. Use hex format like #7ed321.' },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { settings: true },
    });

    const currentBranding = parseBranding(tenant?.settings as string | null);

    const updatedBranding = {
      appName: appName ?? currentBranding.appName ?? DEFAULT_BRANDING.appName,
      logoUrl: logoUrl !== undefined ? logoUrl : currentBranding.logoUrl,
      primaryColorLight:
        primaryColorLight ?? currentBranding.primaryColorLight ?? DEFAULT_BRANDING.primaryColorLight,
      primaryColorDark:
        primaryColorDark ?? currentBranding.primaryColorDark ?? DEFAULT_BRANDING.primaryColorDark,
      faviconUrl: faviconUrl !== undefined ? faviconUrl : currentBranding.faviconUrl,
    };

    const newSettings = mergeBrandingIntoSettings(
      tenant?.settings as string | null,
      updatedBranding,
    );

    // Verify tenant exists before updating
    const tenantExists = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { id: true },
    });

    if (!tenantExists) {
      console.error('Branding save: tenant not found for ID:', ctx.tenantId);
      return NextResponse.json(
        { success: false, error: 'Tenant not found. Try signing out and back in.' },
        { status: 404 },
      );
    }

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
      // Audit log failure should not block branding save
      console.error('Audit log failed:', auditErr);
    }

    const result: ApiResponse = { success: true, data: updatedBranding };
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('PUT /api/settings/branding error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
