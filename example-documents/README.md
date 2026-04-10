# Example Documents

Sample packing slips and barcode sheets for testing the Receiving module.

## Packing Slips

Screenshot these or use them directly as image uploads in the Receiving module.

- `PackingSlip-01.png` - Cisco Systems order (SAMPLE-PO-9006): 2 Catalyst switches + 5 Meraki access points
- `PackingSlip-02.png` - Dell Technologies order (SAMPLE-PO-9005): 3 laptops + 3 monitors + 2 desktops

## Barcode Sheets

Open these HTML files in a browser. Each barcode card shows the item name and the asset tag value. Type the value into the asset tag field during receiving, or use a Bluetooth barcode scanner pointed at the text input.

- `barcodes-packing-slip-01.html` - 7 asset tag barcodes matching the Cisco packing slip
- `barcodes-packing-slip-02.html` - 8 asset tag barcodes matching the Dell packing slip

## How to Test the Full Receiving Flow

1. Go to **Receiving > Start Receiving**
2. Select a purchase order (e.g., SAMPLE-PO-9005 or SAMPLE-PO-9006)
3. Upload the matching packing slip PNG as the image
4. The AI will extract the order number, vendor, and line items
5. For each item, enter the asset tag value from the matching barcode sheet
6. Complete the receiving session

## Barcode Scanner Options

- **Manual entry**: Type the value shown below each barcode into the text field
- **Phone camera**: Use the in-app camera scanner pointed at the barcode on screen
- **Bluetooth scanner**: Place cursor in the asset tag field and scan with a physical scanner (acts as keyboard input)
