import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can view data sources');
    }

    const sources = await prisma.externalDataSource.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        apiUrl: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const body: ApiResponse = { success: true, data: sources };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/settings/data-sources:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can create data sources');
    }

    const data = await req.json();
    const { name, apiUrl, apiHeaders, fieldMappings, isActive } = data;

    if (!name || !apiUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and API URL are required' },
        { status: 400 }
      );
    }

    const source = await prisma.externalDataSource.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        apiUrl,
        apiHeaders: apiHeaders ? JSON.stringify(apiHeaders) : null,
        fieldMapping: JSON.stringify(fieldMappings || []),
        isActive: isActive ?? true,
        lastSyncStatus: 'NEVER',
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'CREATE',
        entity: 'ExternalDataSource',
        entityId: source.id,
        details: `Created external data source: ${name}`,
      },
    });

    const body: ApiResponse = { success: true, data: source };
    return NextResponse.json(body, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/settings/data-sources:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
