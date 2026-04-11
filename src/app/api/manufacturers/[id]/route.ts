import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, NotFoundError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    const manufacturer = await prisma.manufacturer.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        _count: { select: { items: true } },
        items: {
          select: { id: true, name: true, sku: true, manufacturerPartNumber: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundError('Manufacturer', id);
    }

    const body: ApiResponse = { success: true, data: manufacturer };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/manufacturers/[id]:', error);
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
    const data = await req.json();

    const existing = await prisma.manufacturer.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) {
      throw new NotFoundError('Manufacturer', id);
    }

    const manufacturer = await prisma.manufacturer.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? existing.name,
        website: data.website ?? existing.website,
        supportUrl: data.supportUrl ?? existing.supportUrl,
        supportPhone: data.supportPhone ?? existing.supportPhone,
        supportEmail: data.supportEmail ?? existing.supportEmail,
        notes: data.notes ?? existing.notes,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    const body: ApiResponse = { success: true, data: manufacturer };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in PUT /api/manufacturers/[id]:', error);
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

    const existing = await prisma.manufacturer.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) {
      throw new NotFoundError('Manufacturer', id);
    }

    // Soft-delete by deactivating so item references are preserved
    await prisma.manufacturer.update({
      where: { id },
      data: { isActive: false },
    });

    const body: ApiResponse = { success: true, message: 'Manufacturer deactivated' };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in DELETE /api/manufacturers/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
