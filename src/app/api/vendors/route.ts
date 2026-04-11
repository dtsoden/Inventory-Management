import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';
import { VendorService } from '@/lib/vendors/VendorService';

const vendorService = new VendorService(prisma);

class VendorsHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    const sortField = url.searchParams.get('sortField') ?? 'createdAt';
    const sortDirection =
      url.searchParams.get('sortDirection') === 'asc' ? ('asc' as const) : ('desc' as const);
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

    const result = search
      ? await vendorService.search(ctx, search, options)
      : await vendorService.list(ctx, options);
    return this.success(result);
  }

  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const data = await req.json();
    await vendorService.validateVendorData(data);
    const vendor = await vendorService.create(ctx, {
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
    return this.success(vendor, 201);
  }
}

const handler = new VendorsHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
