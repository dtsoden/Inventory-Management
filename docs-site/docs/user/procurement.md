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

If you are not ready to submit, click **Save as Draft**. The PO will land on your Procurement list in the **DRAFT** state. You can return to it at any time, keep adding lines, edit details, or delete it if you change your mind. Drafts are never visible to the vendor and no approver is notified about them.

## The approval flow

Every purchase order moves through a predictable sequence of statuses. Knowing the flow helps you track where each order is and what is expected of you next.

1. **DRAFT.** You are still working on the PO. Nothing has been sent anywhere and nobody has been notified.
2. **PENDING_APPROVAL.** You have clicked **Submit for Approval**. The PO is waiting for a Purchasing Manager (or Admin) to act. You cannot edit lines while it is pending.
3. **APPROVED.** A Purchasing Manager has reviewed and approved the PO. It is locked for editing and ready to be sent to the vendor.
4. **SUBMITTED.** The PO has been emailed to the vendor as a PDF. You are now waiting for the goods to arrive; the next action happens on the Receiving page when the packing slip shows up.
5. **PARTIALLY_RECEIVED.** Some line items have been received; others are still outstanding.
6. **RECEIVED.** Every line item has been received. The PO is closed.
7. **CANCELLED.** The PO was called off before it could complete. This is a terminal state; a cancelled PO cannot be reopened.

### Submitting for approval

1. Open the draft PO.
2. Make sure every line is correct: item, quantity, unit price, and vendor details.
3. Click **Submit for Approval**. The PO moves to **PENDING_APPROVAL**.
4. Every Purchasing Manager and Admin in your tenant gets an in-app notification (bell icon in the top bar), and if your admin has Approval Requests email turned on, they also get an email with a link to the PO.
5. Once an approver acts, the PO returns to your queue. Approve sends it on to **APPROVED**. Reject sends it back to **DRAFT** with a required comment explaining why, and you get a notification in your own bell with the reason.

### What a Purchasing Manager sees

If you have the Purchasing Manager role, the flow from your side looks like this:

1. A new entry appears in your bell dropdown: "Purchase order PO-00042 is awaiting approval." Click it to jump straight to the detail page.
2. Review the header, the line items, the vendor, and the totals. None of these fields are editable for you; your job is to accept or reject the document as submitted.
3. Three actions are available from the top of the page:
   - **Approve** moves the PO to APPROVED and notifies the requester.
   - **Reject** opens a dialog that requires a comment before it will let you submit. The comment is saved to the audit log and delivered to the requester in their bell notification, so they know exactly what to fix. The PO goes back to DRAFT.
   - **Cancel** kills the PO outright. Use this if the request is not just wrong but should never have been made.
4. If you change your mind after approving, see "Amending an approved PO" below.

### Sending the PO to the vendor

Once a PO is in the **APPROVED** state, anyone with edit rights (typically the Manager who drafted it, or either approver role) can click **Send to Vendor**.

This does three things in order:

1. Shane-Inventory generates a branded PDF of the PO (your logo, your colors, all line items, pricing, ship-to details).
2. It looks up the vendor's primary email address and primary contact name on the Vendors page, writes a greeting line using the contact name (or the company name if no contact is set), and emails the PDF as an attachment.
3. Once the email is delivered, the PO moves from **APPROVED** to **SUBMITTED**.

If SMTP email is not configured on the server, the Send to Vendor button will return an error instead of advancing the PO. Ask your admin to finish the SMTP setup under Settings and try again.

If you ever need to re-send the PDF (for example, the vendor lost the email), open the PO and use the **Download PDF** option, then attach it to a fresh email outside the app. There is no dedicated resend button; Send to Vendor only fires on APPROVED POs.

### Amending an approved PO

Once a PO has been approved, every field is locked. You cannot edit line items, quantities, or vendor details, not even typos. This is deliberate: the approval step exists to freeze the document, and silently editing afterwards would defeat the whole point of having approvers.

If you discover that an approved PO needs a change (for example, the vendor called and said an item is back-ordered and they want to substitute a different SKU), the workflow is:

1. Ask a Purchasing Manager (or Admin) to click **Revoke & Amend** on the PO detail page. They will be prompted for a comment explaining why the PO is going back to you.
2. The PO snaps back to **DRAFT** state. You get a notification in your bell with the Purchasing Manager's comment so you know what to change.
3. Edit the PO normally, then click **Submit for Approval** again. The approval cycle repeats.

Revoke & Amend is the only way to get an approved PO back into an editable state. Only Purchasing Managers and Admins can do it.

## Receiving

Receiving shipments against a PO happens on the Receiving page, not the Procurement page. The flow has not changed: open the PO from Receiving, record the quantities that actually showed up on the packing slip, and Shane-Inventory will advance the status to PARTIALLY_RECEIVED or RECEIVED automatically. See the Receiving guide for the details.

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
- If you need to change an approved PO, ask a Purchasing Manager (or Admin) to Revoke & Amend it, which sends it back to DRAFT for editing. Do not cancel and re-create; Revoke & Amend preserves the PO number and history.
- Use the notes field on the PO for anything the vendor needs to know (delivery instructions, reference numbers, project codes).
