import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can view data sources');
    }

    const source = await prisma.externalDataSource.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!source) {
      throw new NotFoundError('ExternalDataSource', id);
    }

    // Parse JSON fields for the response
    const responseData = {
      ...source,
      apiHeaders: source.apiHeaders ? JSON.parse(source.apiHeaders) : {},
      fieldMapping: JSON.parse(source.fieldMapping),
    };

    const body: ApiResponse = { success: true, data: responseData };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/settings/data-sources/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can update data sources');
    }

    const existing = await prisma.externalDataSource.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
      throw new NotFoundError('ExternalDataSource', id);
    }

    const data = await req.json();
    const { name, apiUrl, apiHeaders, fieldMappings, isActive } = data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
    if (apiHeaders !== undefined) updateData.apiHeaders = JSON.stringify(apiHeaders);
    if (fieldMappings !== undefined) updateData.fieldMapping = JSON.stringify(fieldMappings);
    if (isActive !== undefined) updateData.isActive = isActive;

    const source = await prisma.externalDataSource.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'ExternalDataSource',
        entityId: id,
        details: `Updated external data source: ${source.name}`,
      },
    });

    const body: ApiResponse = { success: true, data: source };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in PUT /api/settings/data-sources/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can delete data sources');
    }

    const existing = await prisma.externalDataSource.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
      throw new NotFoundError('ExternalDataSource', id);
    }

    await prisma.externalDataSource.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'DELETE',
        entity: 'ExternalDataSource',
        entityId: id,
        details: `Deleted external data source: ${existing.name}`,
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
    console.error('Unhandled error in DELETE /api/settings/data-sources/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
