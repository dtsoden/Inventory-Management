import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';
import { VendorService } from '@/lib/vendors/VendorService';

const vendorService = new VendorService(prisma);

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('vendors') + 1];
}

class VendorHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const vendor = await vendorService.getByIdOrThrow(ctx, id);
    return this.success(vendor);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const data = await req.json();
    await vendorService.validateVendorData(data);
    const vendor = await vendorService.update(ctx, id, {
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
    return this.success(vendor);
  }

  protected async onDelete(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    await vendorService.delete(ctx, id);
    return this.successMessage('Vendor deactivated');
  }
}

const handler = new VendorHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
