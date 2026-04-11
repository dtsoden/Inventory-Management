import { jsPDF } from 'jspdf';

export interface PdfOrderLine {
  itemName: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
}

export interface PdfOrderData {
  orderNumber: string;
  status: string;
  vendorName: string | null;
  notes: string | null;
  orderedAt: Date | string | null;
  expectedDate: Date | string | null;
  totalAmount: number;
  createdAt: Date | string;
}

export interface PdfTenantData {
  name: string;
  logoBytes?: Buffer | null;
  logoMime?: string | null;
}

/**
 * Generates a professional PDF purchase order document.
 * Returns a Buffer containing the PDF bytes.
 */
export function generatePurchaseOrderPdf(
  order: PdfOrderData,
  lines: PdfOrderLine[],
  tenant: PdfTenantData
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ---------- Header ----------
  // Logo on the left (height-constrained, width organic) and the
  // PURCHASE ORDER label on the right. Tenant name is intentionally
  // omitted, the logo IS the brand mark.
  let headerBottom = y + 18;
  if (tenant.logoBytes && tenant.logoMime) {
    try {
      const logoData = `data:image/${tenant.logoMime.toLowerCase()};base64,${tenant.logoBytes.toString('base64')}`;
      const props = doc.getImageProperties(logoData);
      const targetHeight = 18;
      const targetWidth = (props.width / props.height) * targetHeight;
      doc.addImage(logoData, tenant.logoMime, margin, y, targetWidth, targetHeight, undefined, 'FAST');
      headerBottom = y + targetHeight + 4;
    } catch {
      // Embedding failed, fall back to text-only
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(tenant.name, margin, y + 12);
      headerBottom = y + 18;
    }
  } else {
    // No logo configured, fall back to the tenant name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.name, margin, y + 12);
    headerBottom = y + 18;
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('PURCHASE ORDER', pageWidth - margin, y + 12, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  y = headerBottom;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ---------- PO info row ----------
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PO Number:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderNumber, margin + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPdfDate(order.createdAt), margin + 92, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', margin + 140, y);
  doc.setFont('helvetica', 'normal');
  doc.text(order.status, margin + 155, y);

  y += 6;

  if (order.expectedDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Expected Delivery:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatPdfDate(order.expectedDate), margin + 40, y);
    y += 6;
  }

  y += 4;

  // ---------- Vendor info ----------
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor', margin, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(order.vendorName ?? 'N/A', margin, y);
  y += 10;

  // ---------- Line items table ----------
  const colX = {
    item: margin,
    sku: margin + 70,
    qty: margin + 110,
    unitPrice: margin + 130,
    lineTotal: margin + 160,
  };

  // Table header (rect drawn first, then text inside it, then advance past it)
  const headerRowHeight = 8;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, headerRowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const headerTextY = y + 5.5;
  doc.text('Item', colX.item + 2, headerTextY);
  doc.text('SKU', colX.sku, headerTextY);
  doc.text('Qty', colX.qty, headerTextY, { align: 'right' });
  doc.text('Unit Price', colX.unitPrice, headerTextY, { align: 'right' });
  doc.text('Line Total', colX.lineTotal, headerTextY, { align: 'right' });
  y += headerRowHeight + 4; // gap between header and first row

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Item column has 70mm available before SKU column. At 9pt helvetica
  // that fits roughly 35 chars per line. Wrap instead of truncate so
  // long product names like 'Dell UltraSharp...' stay readable.
  const itemColWidth = colX.sku - colX.item - 4;

  let subtotal = 0;
  for (const line of lines) {
    const lineTotal = line.quantity * line.unitCost;
    subtotal += lineTotal;

    const wrappedItem = doc.splitTextToSize(line.itemName, itemColWidth);
    const rowHeight = Math.max(5, wrappedItem.length * 4.2);

    // Check if we need a new page
    if (y + rowHeight > 260) {
      doc.addPage();
      y = margin;
    }

    doc.text(wrappedItem, colX.item + 2, y);
    doc.text(line.sku ?? 'N/A', colX.sku, y);
    doc.text(String(line.quantity), colX.qty, y, { align: 'right' });
    doc.text(formatCurrency(line.unitCost), colX.unitPrice, y, { align: 'right' });
    doc.text(formatCurrency(lineTotal), colX.lineTotal, y, { align: 'right' });

    y += rowHeight + 1.5;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y - 0.75, pageWidth - margin, y - 0.75);
    y += 1.5;
  }

  if (lines.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text('No line items', margin + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  y += 4;

  // ---------- Totals ----------
  doc.setDrawColor(200, 200, 200);
  doc.line(colX.unitPrice - 20, y - 2, pageWidth - margin, y - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);

  doc.text('Subtotal:', colX.unitPrice - 15, y + 2, { align: 'right' });
  doc.text(formatCurrency(subtotal), colX.lineTotal, y + 2, { align: 'right' });

  // Tax (difference between total and subtotal, if any)
  const tax = order.totalAmount - subtotal;
  if (Math.abs(tax) > 0.005) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Tax:', colX.unitPrice - 15, y + 2, { align: 'right' });
    doc.text(formatCurrency(tax), colX.lineTotal, y + 2, { align: 'right' });
  }

  y += 8;
  doc.setFillColor(240, 240, 240);
  doc.rect(colX.unitPrice - 50, y - 3, contentWidth - (colX.unitPrice - 50 - margin), 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', colX.unitPrice - 15, y + 2, { align: 'right' });
  doc.text(formatCurrency(order.totalAmount), colX.lineTotal, y + 2, { align: 'right' });

  y += 14;

  // ---------- Notes ----------
  if (order.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(order.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  // ---------- Footer ----------
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-US')} by ${tenant.name}`,
    margin,
    footerY
  );
  doc.text(order.orderNumber, pageWidth - margin, footerY, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatPdfDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
