import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import {
  purchaseOrderRepository,
  purchaseOrderService,
} from '@/lib/procurement';
import { generatePurchaseOrderPdf } from '@/lib/procurement/pdf-generator';
import { emailService } from '@/lib/email/email-service';
import { prisma } from '@/lib/db';

class SendToVendorHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('orders') + 1];

    const order = await purchaseOrderRepository.findByIdWithRelations(
      ctx.tenantId,
      id
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Order must be in APPROVED status to send to vendor',
        },
        { status: 400 }
      );
    }

    // Try to find the vendor email and primary contact by matching vendorName
    let vendorEmail: string | null = null;
    let vendorName = order.vendorName ?? 'Vendor';
    let contactName: string | null = null;

    if (order.vendorName) {
      const vendor = await (prisma as any).vendor.findFirst({
        where: {
          tenantId: ctx.tenantId,
          name: order.vendorName,
        },
        select: { email: true, name: true, contactName: true },
      });

      if (vendor?.email) {
        vendorEmail = vendor.email;
        vendorName = vendor.name;
        contactName = vendor.contactName ?? null;
      }
    }

    // Allow overriding the email via the request body
    try {
      const body = await req.json().catch(() => ({}));
      if (body.email) {
        vendorEmail = body.email;
      }
    } catch {
      // No body provided, that is fine
    }

    if (!vendorEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No email address found for this vendor. Add an email to the vendor record or provide one in the request body.',
        },
        { status: 400 }
      );
    }

    // Fetch tenant for PDF header
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true },
    });

    const lines = (order.lines ?? []).map((l) => ({
      itemName: l.item?.name ?? 'Unknown Item',
      sku: l.item?.sku ?? null,
      quantity: l.quantity,
      unitCost: l.unitCost,
    }));

    const pdfBuffer = generatePurchaseOrderPdf(
      order,
      lines,
      { name: tenant?.name ?? 'Inventory System' }
    );

    // Send the email
    try {
      await emailService.sendPurchaseOrder({
        to: vendorEmail,
        vendorName,
        contactName,
        orderNumber: order.orderNumber,
        pdfBuffer,
      });
    } catch (err) {
      console.error('Failed to send PO email:', err);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email. Check SMTP configuration.',
        },
        { status: 500 }
      );
    }

    // Transition order to SUBMITTED
    const updated = await purchaseOrderService.submitToVendor(ctx, id);

    return this.success({
      message: `Purchase order ${order.orderNumber} sent to ${vendorEmail}`,
      order: updated,
    });
  }
}

const handler = new SendToVendorHandler();
export const POST = handler.handle('POST');
