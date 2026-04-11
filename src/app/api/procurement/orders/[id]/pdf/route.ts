import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { purchaseOrderRepository } from '@/lib/procurement';
import { generatePurchaseOrderPdf } from '@/lib/procurement/pdf-generator';
import { prisma } from '@/lib/db';
import { parseBranding } from '@/lib/branding';

class PdfHandler extends BaseApiHandler {
  protected async onGet(
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

    // Fetch tenant info for the header (name + branding)
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, settings: true },
    });

    const branding = parseBranding(tenant?.settings as string | null);

    // Resolve a logo URL to an actual file on disk so jsPDF can embed it.
    // Branding URLs look like /api/files/uploads/branding/<filename>; the
    // file lives at <cwd>/data/uploads/branding/<filename>.
    let logoBytes: Buffer | null = null;
    let logoMime: string | null = null;
    const logoUrl = branding.logoUrlLight || branding.logoUrlDark;
    if (logoUrl) {
      try {
        const filesPrefix = '/api/files/';
        if (logoUrl.startsWith(filesPrefix)) {
          const relative = logoUrl.slice(filesPrefix.length);
          const safe = relative.replace(/\.\.+/g, '');
          const onDisk = path.join(process.cwd(), 'data', safe);
          logoBytes = await readFile(onDisk);
          const ext = path.extname(onDisk).toLowerCase();
          logoMime =
            ext === '.png'
              ? 'PNG'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'JPEG'
                : ext === '.webp'
                  ? 'WEBP'
                  : null;
        }
      } catch {
        // Logo file unreadable, fall back to text-only header.
        logoBytes = null;
      }
    }

    const lines = (order.lines ?? []).map((l) => ({
      itemName: l.item?.name ?? 'Unknown Item',
      sku: l.item?.sku ?? null,
      quantity: l.quantity,
      unitCost: l.unitCost,
    }));

    const pdfBuffer = generatePurchaseOrderPdf(
      order,
      lines,
      {
        name: tenant?.name ?? branding.appName ?? 'Inventory System',
        logoBytes,
        logoMime,
      },
    );

    // Save to disk for future reference
    const outputDir = path.join(process.cwd(), 'data', 'generated');
    await mkdir(outputDir, { recursive: true });

    const filename = `PO-${order.orderNumber}.pdf`;
    const filePath = path.join(outputDir, filename);
    await writeFile(filePath, pdfBuffer);

    // Return the PDF as a download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  }
}

const handler = new PdfHandler();
export const GET = handler.handle('GET');
