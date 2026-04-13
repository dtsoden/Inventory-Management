---
title: Receiving
sidebar_label: Receiving
---

Receiving is where physical shipments meet your digital inventory. When a box arrives at your dock, this is the page you open to match it against the purchase order, scan the individual units, and make everything available to the rest of the team.

## What you can do here

- Receive a packing slip against an existing purchase order.
- Scan a barcode or QR code to find the right PO instantly.
- Use AI to read the packing slip image and pre-fill line items.
- Scan asset tags onto each received unit for full traceability.
- Mark the receipt complete so every scanned asset becomes **AVAILABLE** in inventory.

## The receiving workflow at a glance

Every shipment follows the same four-step pattern:

1. **Find the PO.** Scan the packing slip barcode or search for it by number.
2. **Extract the lines.** Snap a picture of the packing slip and let the AI read it for you.
3. **Scan the assets.** Walk the physical units and scan each asset tag or serial number.
4. **Complete the receipt.** The system moves everything into **AVAILABLE** status with a full audit trail back to the purchase order.

The rest of this page walks through each step in detail.

## Step 1: Find the purchase order

Open **Receiving** from the sidebar and click **Receive Shipment**.

### Scan the packing slip barcode

Packing slips printed from Inventory-Management include both a **Code 128** barcode and a **QR code** that encode the purchase order number. You have two ways to scan them:

- **Netum handheld scanner.** Click the barcode field to give it focus, then pull the trigger on your scanner. The PO will load instantly.
- **Camera scan.** If you do not have a handheld scanner nearby, click the camera icon next to the barcode field. Your browser will ask for camera permission, and you can aim your webcam or phone camera at the code. The system reads both Code 128 and QR codes.

If scanning does not work (for example, the barcode is damaged), you can type the PO number directly into the search box instead.

### Confirm the right PO

Once the PO loads, you will see the vendor, the expected items, and the quantities ordered. Double-check that this matches the packing slip in your hand before moving on. If the PO is wrong, clear it and try again.

## Step 2: Extract the packing slip with AI

Inventory-Management includes an AI extraction step that saves you from typing out every line on the packing slip.

1. Click **Upload Packing Slip** and choose a photo or PDF of the packing slip. You can snap a picture with your phone or use a scanned file.
2. The AI reads the image and returns a proposed list of items and quantities.
3. Review the extracted lines against the physical packing slip and the PO. Edit anything that looks wrong: the AI is usually accurate, but you are the final authority.
4. Accept the extraction to continue.

If the AI misses a line, you can add it manually from the purchase order. If the vendor sent extra items that were not on the PO, flag them; your administrator can decide how to handle the discrepancy.

## Step 3: Scan the assets

Most items in Inventory-Management are tracked as individual assets: every unit has its own tag or serial number. During receiving, you scan each physical unit so the system knows exactly what landed in your warehouse.

1. Pick up the first unit from the shipment.
2. Scan its asset tag (or serial number) with your handheld scanner, or click the camera icon to scan with your webcam.
3. The scanned asset appears under the correct line on the receipt.
4. Repeat for every unit in the box.

As you scan, the receipt shows a running count: "3 of 5 received" for each line. This makes it easy to see what is left and catch any shortages before you close out the shipment.

If an asset tag is missing or unreadable, you can generate a new one from the receipt screen and physically apply it to the unit.

## Step 4: Complete the receipt

When every unit has been scanned and the counts match, click **Mark Receipt Complete**. This triggers several things at once:

- Every scanned asset is created (or updated) in the system with status **AVAILABLE**.
- Each asset is linked back to the **purchase order line** it came from, so you can trace any unit to its original order, vendor, and price.
- The purchase order is updated to reflect the received quantities. If everything was received, the PO moves to **RECEIVED**; if it was a partial shipment, the remaining quantities stay open.
- The items on the PO see their stock on hand increase, so the Inventory page and Dashboard KPIs reflect the new totals immediately.

From this point on, the assets are ready to be deployed, reserved, or searched for by anyone on the team.

## Handling special cases

### Partial shipments

If the vendor only shipped part of an order, receive what you have and mark the receipt complete. The PO stays open with the remaining quantities, and you can receive the rest on a later visit.

### Damaged or wrong items

If a unit arrives damaged or the vendor shipped the wrong product, do not scan it into stock. Note it on the receipt screen, finish receiving the good units, and notify the vendor separately. Your administrator can help you process a return.

### Items without asset tracking

Some items (for example, consumables) are tracked only by quantity, not by individual asset tag. For these, you enter the received count on the line instead of scanning each unit. The system adds the quantity to stock on hand without creating individual asset records.

## Typical workflows

### "A shipment just arrived at the dock."

1. Open **Receiving** and click **Receive Shipment**.
2. Scan the barcode on the packing slip to load the PO.
3. Upload a photo of the packing slip and let the AI extract the lines.
4. Scan every physical unit into the matching line.
5. Click **Mark Receipt Complete**.

### "Half the order came today, the rest is still in transit."

1. Receive the units that arrived, just like above.
2. Mark the receipt complete. The PO will stay open for the balance.
3. When the second shipment arrives, start a new receipt against the same PO.

## Tips

- Keep your handheld scanner close to the dock. It is faster than camera scanning for high-volume days.
- The AI extraction is a starting point, not the final answer; always compare it to the physical packing slip before accepting.
- If you are ever unsure, the purchase order itself is the source of truth. Match what is in the box to what was ordered, not the other way around.
