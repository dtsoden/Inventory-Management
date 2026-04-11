---
title: Procurement
sidebar_label: Procurement
---

Procurement is where you plan, create, and track purchase orders (POs). Every shipment that eventually shows up at your receiving dock starts as a purchase order on this page.

## What you can do here

- Browse every purchase order, filtered by status.
- Create a new purchase order and pick a vendor.
- Add items to the PO from your own catalog or from the vendor's online catalog.
- Save drafts, submit for approval, and track orders through to delivery.
- Watch a PO move through its lifecycle from draft to approved to submitted.

## Creating a purchase order

1. Open **Procurement** from the sidebar.
2. Click **New Purchase Order** near the top of the page.
3. Pick a **vendor** from the dropdown. Only vendors you have on file will appear; if the vendor you need is missing, add them first on the Vendors page.
4. Optionally add a reference number, expected ship date, and notes for the vendor.
5. Add the items you want to order (see the next section).
6. Review the subtotal, shipping, and total at the bottom of the page.
7. Click **Save as Draft** to keep working on it later, or **Submit for Approval** when you are ready to send it through the approval flow.

## Adding items

There are two ways to add items to a PO, and you can mix them on the same order.

### From your catalog

Click **Add from Catalog** to open a picker that lists every item already in your Inventory. This is the normal path for items you regularly stock.

1. Search or scroll to find the item you need.
2. Click to add it to the order; it will appear as a new line with the item's default unit price.
3. Set the quantity you want to order.
4. Repeat for as many items as you need.

### From the vendor's online catalog

Some vendors expose their live catalog to Shane-Inventory through an API. When that is the case, you will see an **Add from Vendor Catalog** button on the PO.

1. Click **Add from Vendor Catalog**. A panel opens showing the vendor's current products, with current prices and availability.
2. Search or browse to the product you want.
3. Click to add it to the PO. If the product is new to your system, Shane-Inventory will map it into your catalog so you can track it going forward.
4. Adjust the quantity and save.

This is the fastest way to buy items you do not already stock, because you do not have to type part numbers or prices by hand.

## Saving as a draft

If you are not ready to submit, click **Save as Draft**. The PO will land on your Procurement list in the **DRAFT** state. You can return to it at any time, keep adding lines, edit details, or delete it if you change your mind. Drafts are never visible to the vendor.

## The approval flow

Every purchase order moves through a predictable sequence of statuses. Knowing the flow helps you track where each order is and what is expected of you next.

1. **DRAFT.** You are still working on the PO. Nobody else is notified.
2. **PENDING_APPROVAL.** You have clicked **Submit for Approval**. The PO is now waiting for an approver. You cannot edit lines while it is pending, but you can cancel and return it to draft if you need to fix something.
3. **APPROVED.** An approver has reviewed and approved the PO. It is now ready to be sent to the vendor.
4. **SUBMITTED.** The PO has been sent to the vendor. At this point you are waiting for the vendor to ship the goods; the next action usually happens on the Receiving page when the packing slip arrives.

Additional statuses, such as **RECEIVED** or **CANCELLED**, may appear once the shipment has been processed or the order has been called off.

### Submitting for approval

1. Open the draft PO.
2. Make sure every line is correct: item, quantity, unit price, and vendor details.
3. Click **Submit for Approval**. The PO moves to **PENDING_APPROVAL** and the approver is notified.
4. Once the approver acts, you will see the status change to **APPROVED** (or back to **DRAFT** with comments, if they want changes).

### Sending the PO to the vendor

Once approved, Shane-Inventory emails a professionally formatted PO PDF directly to the vendor. The PDF includes your company branding, all line items, pricing, and ship-to details. You do not need to attach anything manually; the system handles generation and delivery as part of moving the order to **SUBMITTED**.

If you ever need to re-send the PDF (for example, the vendor lost the email), open the PO and use the **Download PDF** or **Resend to Vendor** options.

## Browsing and filtering orders

The main Procurement page lists every PO in the system. Use the filters at the top to narrow the list by:

- Status (Draft, Pending Approval, Approved, Submitted, Received, Cancelled).
- Vendor.
- Date range.
- Created by, if you want to see only your own orders.

Click any row to open the full PO detail page.

## Typical workflows

### "I need to reorder a low stock item."

1. From the Inventory page, note the item that is low.
2. Open **Procurement** and click **New Purchase Order**.
3. Pick the vendor you normally buy this item from.
4. Add the item from your catalog, set the quantity, and submit for approval.

### "A vendor just released a new product I want to stock."

1. Open **Procurement** and click **New Purchase Order**.
2. Pick the vendor.
3. Click **Add from Vendor Catalog**, find the new product, and add it.
4. Save as draft if you want to keep shopping, or submit right away.

### "Where is my order?"

1. Open **Procurement**.
2. Filter by the vendor or search by PO number.
3. Check the status column: anything in **SUBMITTED** is waiting on the vendor and will show up on the Receiving page when it arrives.

## Tips

- Keep drafts clean: delete ones you do not intend to submit, so your list stays readable.
- If you need to change an approved PO, cancel it and create a new one; editing after approval would bypass the approval flow.
- Use the notes field on the PO for anything the vendor needs to know (delivery instructions, reference numbers, project codes).
