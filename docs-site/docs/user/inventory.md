---
title: Inventory
sidebar_label: Inventory
---

The Inventory page is where you browse every item your company stocks. It is the source of truth for what you have, how much of it is on hand, and where each physical unit came from.

## What you can do here

- Browse your complete catalog of items, one row per item.
- Spot items that need reordering with the **LOW STOCK** badge.
- Search and filter to find exactly what you are looking for.
- Open any item to see its current stock, every individual asset, and its full purchase history.

## One row per item

An important thing to understand before you start clicking around: the Inventory list shows **one row per Item**, not one row per physical unit. For example, if you stock a "UniFi U6-Pro Access Point", you will see a single row for that item, even if you have twenty of them on the shelf. To see each individual unit (with its serial number, received date, and asset tag), open the item and look at the **Assets** tab.

This design keeps the main list short and readable; the detail view is where you drill into the physical world.

## Browsing the list

When you open **Inventory** from the sidebar, you will see a table with the most useful columns at a glance:

- The item name and a short description.
- The manufacturer and model.
- The total quantity on hand.
- The reorder threshold.
- A status badge, such as **LOW STOCK**, when the item needs attention.

You can scroll through the full list, or use the tools at the top of the page to narrow it down.

### The LOW STOCK badge

Any item whose quantity on hand has fallen to or below its reorder threshold is marked with a **LOW STOCK** badge. The badge is designed to be hard to miss: if you are just skimming the list, these are the rows that need your attention. From there, your usual next step is to create a purchase order for that item (see the Procurement guide).

### Searching and filtering

Use the search box at the top of the Inventory page to find an item by name, description, manufacturer, or model. Typing narrows the list in real time; clearing the box restores the full list.

You can also apply filters to show only items that match certain criteria, for example:

- Items from a specific manufacturer.
- Items with the **LOW STOCK** badge.
- Items belonging to a particular category.

Filters stack, so you can combine them (for example, low stock items from a single manufacturer) to quickly produce a short, focused list.

## Opening an item

Click any row to open the item detail page. This view is organized into tabs so you can move between summary, assets, and history without losing context.

### Stock summary

The top of the item page shows a summary panel with the information you need most often:

- Item name, description, manufacturer, and model.
- The current quantity on hand.
- The reorder threshold and whether the item is currently low on stock.
- The last received date and the last price paid.

This is usually all you need to answer the question, "Do we have this, and should we order more?"

### The Assets tab

The **Assets** tab lists every physical unit of this item that has been received into your inventory. Each row represents a single asset and includes:

- The asset tag or serial number.
- The current status, such as **AVAILABLE**, **DEPLOYED**, or **RETIRED**.
- The date it was received.
- The purchase order line it came from, which is clickable so you can trace any unit back to the order that brought it in.

Use this tab whenever you need to answer a question about a specific unit: where did this one come from, when did we receive it, and what state is it in today?

### The Purchase History tab

The **Purchase History** tab shows every purchase order line that has ever ordered this item, with the newest first. For each line you can see:

- The purchase order number.
- The vendor.
- The quantity ordered and the quantity received.
- The unit price.
- The order status.

This is useful for answering pricing and supplier questions, such as "How much did we pay last time?" or "Which vendor delivers this fastest?" Click any row to jump to the full purchase order.

## Typical workflows

### "Do we have this item in stock?"

1. Open **Inventory**.
2. Type the item name or model into the search box.
3. Read the quantity on hand in the list or open the item for full detail.

### "Which items do I need to reorder?"

1. Open **Inventory**.
2. Apply the **LOW STOCK** filter.
3. Review the resulting list and create purchase orders from the **Procurement** page.

### "Where did this specific unit come from?"

1. Open **Inventory** and find the item.
2. Click to open it, then switch to the **Assets** tab.
3. Find the row for the asset tag or serial number you are investigating.
4. Click the purchase order line to see the original order.

## Tips

- If an item never seems to get a **LOW STOCK** badge even though it is running out, check its reorder threshold; it may be set too low.
- The Assets tab is the fastest way to audit a shelf: print the list, walk the warehouse, and check off what you find.
- Combine the search box with the AI assistant for more complex questions. For example, ask the assistant, "How many UniFi access points do we have available?" and it will answer in plain language using your live data.
