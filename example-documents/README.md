# Example Documents

Sample packing slips and barcode sheets for testing the Receiving module. Each of the 4 sample purchase orders has a matching packing slip and barcode sheet.

## Packing Slips

Open in a browser and print to PDF (Ctrl+P > Save as PDF), or upload the HTML files directly using the file upload feature in Receiving.

| File | PO | Vendor | Items |
|---|---|---|---|
| `packing-slip-9009.html` | SAMPLE-PO-9009 | HP Inc. | 2 Dell Precision + 7 ThinkPad T14s + 8 X1 Carbon (17 units) |
| `packing-slip-9010.html` | SAMPLE-PO-9010 | Lenovo | 5 MacBook Air + 8 Catalyst 9200L + 4 Catalyst 9300 + 6 EliteBook (23 units) |
| `packing-slip-9011.html` | SAMPLE-PO-9011 | Apple Inc. | 2 ISR 4331 + 6 Meraki MR46 + 5 SFP Transceivers (13 units) |
| `packing-slip-9012.html` | SAMPLE-PO-9012 | Logitech | 1 Dell Monitor + 2 Thunderbolt Docks + 4 Brio Webcams + 7 MX Keys (14 units) |

## Barcode Sheets

Open in a browser. Each card shows a Code 128 barcode (1D) and QR code (2D) with the serial number for one asset. Scan from screen or print for reliable scanning.

| File | PO | Barcodes |
|---|---|---|
| `barcodes-9009.html` | SAMPLE-PO-9009 | 17 asset tags |
| `barcodes-9010.html` | SAMPLE-PO-9010 | 23 asset tags |
| `barcodes-9011.html` | SAMPLE-PO-9011 | 13 asset tags |
| `barcodes-9012.html` | SAMPLE-PO-9012 | 14 asset tags |

## How to Test the Full Receiving Flow

1. Go to **Receiving > Start Receiving**
2. Select a purchase order (e.g., SAMPLE-PO-9009)
3. Upload the matching packing slip HTML (or print it to PDF first and upload the PDF)
4. The AI extracts the order number, vendor, and line items with serial numbers
5. Review and edit the extraction if needed, then confirm
6. For each item, scan or type the asset tag from the matching barcode sheet
7. Complete the receiving session

## Scanning Options

- **Handheld scanner (desktop)**: Place cursor in the asset tag field, scan the barcode. Auto-submits on Enter, auto-advances to next item.
- **Phone camera (mobile)**: Camera opens automatically in tagging mode. Point at the barcode, it auto-submits and advances.
- **Manual entry**: Type the value shown below each barcode and press Enter.

## Regenerating Files

If the sample data changes, regenerate all files:

```bash
node example-documents/generate-examples.mjs
```
