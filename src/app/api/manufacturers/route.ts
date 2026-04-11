import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const url = req.nextUrl;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50', 10)));
    const search = url.searchParams.get('search') ?? '';
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };
    if (activeOnly) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.manufacturer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { items: true } },
        },
      }),
      prisma.manufacturer.count({ where }),
    ]);

    const result = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    const body: ApiResponse = { success: true, data: result };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/manufacturers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const data = await req.json();

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Manufacturer name is required' },
        { status: 400 }
      );
    }

    const manufacturer = await prisma.manufacturer.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name.trim(),
        website: data.website || null,
        supportUrl: data.supportUrl || null,
        supportPhone: data.supportPhone || null,
        supportEmail: data.supportEmail || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
    });

    const body: ApiResponse = { success: true, data: manufacturer };
    return NextResponse.json(body, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/manufacturers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
