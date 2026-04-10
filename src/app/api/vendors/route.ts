import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { VendorService } from '@/lib/vendors/VendorService';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

const service = new VendorService(prisma);

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const url = req.nextUrl;

    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    const sortField = url.searchParams.get('sortField') ?? 'createdAt';
    const sortDirection =
      url.searchParams.get('sortDirection') === 'asc' ? 'asc' as const : 'desc' as const;
    const search = url.searchParams.get('search') ?? '';
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';

    const options = {
      pagination: {
        page: Math.max(1, page),
        pageSize: Math.min(100, Math.max(1, pageSize)),
      },
      sort: { field: sortField, direction: sortDirection },
      where: activeOnly ? {} : { isActive: undefined },
    };

    let result;
    if (search) {
      result = await service.search(ctx, search, options);
    } else {
      result = await service.list(ctx, options);
    }

    const body: ApiResponse = { success: true, data: result };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/vendors:', error);
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

    await service.validateVendorData(data);

    const vendor = await service.create(ctx, {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      country: data.country || null,
      website: data.website || null,
      notes: data.notes || null,
      rating: data.rating ?? null,
    });

    const body: ApiResponse = { success: true, data: vendor };
    return NextResponse.json(body, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
