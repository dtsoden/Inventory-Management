#!/usr/bin/env node
/**
 * Generates example packing slip HTML files (printable to PDF)
 * and barcode HTML files for the 4 sample purchase orders.
 * Run: node example-documents/generate-examples.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const POs = [
  {
    orderNumber: 'SAMPLE-PO-9009',
    vendor: 'HP Inc.',
    date: '2026-04-10',
    shipTo: 'Warehouse A, 1500 Industrial Blvd, Austin TX 78701',
    items: [
      { name: 'Dell Precision 5680', sku: 'DEL-PRE-5680', qty: 2, unit: 1899.99, serials: ['5CG4501RXK', '5CG4501RXL'] },
      { name: 'Lenovo ThinkPad T14s Gen 5', sku: 'LEN-TP-T14S', qty: 7, unit: 1349.00, serials: ['PF4GNWT1', 'PF4GNWT2', 'PF4GNWT3', 'PF4GNWT4', 'PF4GNWT5', 'PF4GNWT6', 'PF4GNWT7'] },
      { name: 'Lenovo ThinkPad X1 Carbon Gen 12', sku: 'LEN-TP-X1C12', qty: 8, unit: 1749.00, serials: ['PF4HXCB1', 'PF4HXCB2', 'PF4HXCB3', 'PF4HXCB4', 'PF4HXCB5', 'PF4HXCB6', 'PF4HXCB7', 'PF4HXCB8'] },
    ],
  },
  {
    orderNumber: 'SAMPLE-PO-9010',
    vendor: 'Lenovo',
    date: '2026-04-11',
    shipTo: 'Warehouse B, 2200 Commerce Dr, Dallas TX 75201',
    items: [
      { name: 'Apple MacBook Air 15" M3', sku: 'APL-MBA-15M3', qty: 5, unit: 1299.00, serials: ['FVFG2M1A01', 'FVFG2M1A02', 'FVFG2M1A03', 'FVFG2M1A04', 'FVFG2M1A05'] },
      { name: 'Cisco Catalyst 9200L-24P Switch', sku: 'CIS-C9200L-24P', qty: 8, unit: 2895.00, serials: ['FCW2501A01', 'FCW2501A02', 'FCW2501A03', 'FCW2501A04', 'FCW2501A05', 'FCW2501A06', 'FCW2501A07', 'FCW2501A08'] },
      { name: 'Cisco Catalyst 9300-48T Switch', sku: 'CIS-C9300-48T', qty: 4, unit: 4750.00, serials: ['FCW2602B01', 'FCW2602B02', 'FCW2602B03', 'FCW2602B04'] },
      { name: 'HP EliteBook 860 G11', sku: 'HP-EB-860G11', qty: 6, unit: 1589.00, serials: ['5CG5601AA1', '5CG5601AA2', '5CG5601AA3', '5CG5601AA4', '5CG5601AA5', '5CG5601AA6'] },
    ],
  },
  {
    orderNumber: 'SAMPLE-PO-9011',
    vendor: 'Apple Inc.',
    date: '2026-04-11',
    shipTo: 'Network Closet C, 800 Tech Park Way, San Jose CA 95110',
    items: [
      { name: 'Cisco ISR 4331 Router', sku: 'CIS-ISR4331', qty: 2, unit: 3295.00, serials: ['FDO2401C01', 'FDO2401C02'] },
      { name: 'Cisco Meraki MR46 Access Point', sku: 'CIS-MR46', qty: 6, unit: 795.00, serials: ['Q3AC-MR46-001', 'Q3AC-MR46-002', 'Q3AC-MR46-003', 'Q3AC-MR46-004', 'Q3AC-MR46-005', 'Q3AC-MR46-006'] },
      { name: 'Cisco SFP-10G-SR Transceiver', sku: 'CIS-SFP10GSR', qty: 5, unit: 245.00, serials: ['AVD2301SR01', 'AVD2301SR02', 'AVD2301SR03', 'AVD2301SR04', 'AVD2301SR05'] },
    ],
  },
  {
    orderNumber: 'SAMPLE-PO-9012',
    vendor: 'Logitech',
    date: '2026-04-12',
    shipTo: 'Office D, 350 Innovation Ave, Seattle WA 98101',
    items: [
      { name: 'Dell UltraSharp U2723QE 27" 4K Monitor', sku: 'DEL-U2723QE', qty: 1, unit: 619.99, serials: ['CN0D7K2M01'] },
      { name: 'Dell WD22TB4 Thunderbolt Dock', sku: 'DEL-WD22TB4', qty: 2, unit: 299.99, serials: ['CN0W4TB401', 'CN0W4TB402'] },
      { name: 'Logitech Brio 4K Webcam', sku: 'LOG-BRIO4K', qty: 4, unit: 169.99, serials: ['2251LZ0001', '2251LZ0002', '2251LZ0003', '2251LZ0004'] },
      { name: 'Logitech MX Keys S Keyboard', sku: 'LOG-MXKS', qty: 7, unit: 109.99, serials: ['2252MK0001', '2252MK0002', '2252MK0003', '2252MK0004', '2252MK0005', '2252MK0006', '2252MK0007'] },
    ],
  },
];

function generatePackingSlipHtml(po) {
  const subtotal = po.items.reduce((s, i) => s + i.qty * i.unit, 0);
  const rows = po.items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${item.name}</strong><br><span style="color:#666;font-size:12px">SKU: ${item.sku}</span></td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">$${item.unit.toFixed(2)}</td>
      <td style="text-align:right">$${(item.qty * item.unit).toFixed(2)}</td>
    </tr>
    <tr>
      <td></td>
      <td colspan="4" style="font-size:11px;color:#555;padding:2px 8px 8px">
        <strong>Serial Numbers:</strong> ${item.serials.join(', ')}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<title>Packing Slip - ${po.orderNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: #fff; color: #222; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #333; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 24px; }
  .header .po-number { font-size: 20px; font-weight: bold; color: #333; text-align: right; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 14px; }
  .meta-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
  .meta-box h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #555; }
  tbody td { border: 1px solid #eee; padding: 8px; vertical-align: top; }
  tbody tr:nth-child(4n+3) td, tbody tr:nth-child(4n+4) td { background: #fafafa; }
  .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 16px; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #888; text-align: center; }
  @media print { body { margin: 0; padding: 10px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>PACKING SLIP</h1>
      <p style="color:#666;font-size:14px;margin-top:4px">${po.vendor}</p>
    </div>
    <div class="po-number">
      ${po.orderNumber}<br>
      <span style="font-size:13px;font-weight:normal;color:#666">Date: ${po.date}</span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <h3>Ship From</h3>
      <p>${po.vendor}<br>Distribution Center</p>
    </div>
    <div class="meta-box">
      <h3>Ship To</h3>
      <p>${po.shipTo}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item</th>
        <th style="width:60px;text-align:center">Qty</th>
        <th style="width:100px;text-align:right">Unit Price</th>
        <th style="width:100px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right">Subtotal</td>
        <td style="text-align:right">$${subtotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    This is a sample packing slip for testing purposes. Generated for Inventory Management demo.
  </div>
</body>
</html>`;
}

function generateBarcodeHtml(po) {
  const allSerials = [];
  for (const item of po.items) {
    for (const sn of item.serials) {
      allSerials.push({ label: `${item.name}`, value: sn });
    }
  }

  const cardScript = allSerials.map((s, i) => `  { label: ${JSON.stringify(s.label)}, value: ${JSON.stringify(s.value)} }`).join(',\n');

  return `<!DOCTYPE html>
<html>
<head>
<title>Asset Tag Barcodes - ${po.orderNumber} (${po.vendor})</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; background: #fff; }
h1 { font-size: 20px; margin-bottom: 5px; }
p.subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.barcode-card {
  border: 2px solid #000;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  page-break-inside: avoid;
  background: #fff;
  overflow: hidden;
  min-width: 0;
}
.barcode-card h3 { font-size: 12px; color: #333; margin: 0 0 10px 0; }
.codes { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
.barcode-svg { min-width: 0; }
.barcode-svg svg { max-width: 100%; height: auto; }
.qr-code { flex-shrink: 0; }
.qr-code canvas { display: block; }
.value-label { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-top: 8px; }
.tips { margin-top: 30px; padding: 16px; background: #f5f5f5; border-radius: 8px; font-size: 13px; }
.tips strong { display: block; margin-bottom: 6px; }
.tips ul { margin: 6px 0 0 16px; padding: 0; }
.tips li { margin-bottom: 4px; }
@media print {
  body { margin: 0; padding: 10px; }
  .tips { display: none; }
}
</style>
</head>
<body>
<h1>Asset Tag Barcodes - ${po.orderNumber} (${po.vendor})</h1>
<p class="subtitle">Each card has a Code 128 barcode (1D) and a QR code (2D). Scan either format.</p>

<div class="grid" id="cards"></div>

<div class="tips">
<strong>Scanning tips:</strong>
<ul>
<li>Set screen brightness to maximum</li>
<li>Hold scanner 4-6 inches from screen</li>
<li>Try the QR code if the barcode doesn't scan</li>
<li>Zoom in (Ctrl+Plus) to make codes larger if needed</li>
<li>Print this page for the most reliable scanning</li>
</ul>
</div>

<script>
const items = [
${cardScript}
];

const container = document.getElementById('cards');

items.forEach((item, i) => {
  const card = document.createElement('div');
  card.className = 'barcode-card';
  card.innerHTML = \`
    <h3>\${item.label}</h3>
    <div class="codes">
      <div class="barcode-svg"><svg id="bar\${i}"></svg></div>
      <div class="qr-code"><canvas id="qr\${i}"></canvas></div>
    </div>
    <div class="value-label">\${item.value}</div>
  \`;
  container.appendChild(card);

  JsBarcode(\`#bar\${i}\`, item.value, {
    format: 'CODE128',
    width: 3,
    height: 70,
    displayValue: false,
    margin: 8,
    background: '#ffffff',
    lineColor: '#000000',
  });

  const qr = qrcode(0, 'M');
  qr.addData(item.value);
  qr.make();
  const canvas = document.getElementById(\`qr\${i}\`);
  const size = 80;
  const cellSize = Math.floor(size / qr.getModuleCount());
  canvas.width = cellSize * qr.getModuleCount();
  canvas.height = cellSize * qr.getModuleCount();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < qr.getModuleCount(); row++) {
    for (let col = 0; col < qr.getModuleCount(); col++) {
      if (qr.isDark(row, col)) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
});
<\/script>
</body>
</html>`;
}

// Generate all files
for (const po of POs) {
  const num = po.orderNumber.replace('SAMPLE-PO-', '');

  const packingSlipPath = join(__dirname, `packing-slip-${num}.html`);
  writeFileSync(packingSlipPath, generatePackingSlipHtml(po));
  console.log(`Created: packing-slip-${num}.html`);

  const barcodePath = join(__dirname, `barcodes-${num}.html`);
  writeFileSync(barcodePath, generateBarcodeHtml(po));
  console.log(`Created: barcodes-${num}.html`);
}

console.log('\nDone. Open each packing slip in a browser and print to PDF (Ctrl+P > Save as PDF).');
console.log('Or use them directly as HTML files for testing the upload feature.');
