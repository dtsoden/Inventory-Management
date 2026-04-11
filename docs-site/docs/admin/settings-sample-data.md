---
title: Sample Data
sidebar_label: Sample Data
---

# Sample Data

Path: `/settings/sample-data`. Source: `src/app/(authenticated)/settings/sample-data/page.tsx`. API: `/api/settings/sample-data`.

The Sample Data page lets an administrator load a realistic demo dataset into the tenant for evaluation, training, or screen recording, and then cleanly remove it afterwards without touching real data. It is the single best way to explore the platform with something that looks like a real inventory without having to hand enter a hundred rows.

## What gets loaded

The expected counts, defined as `EXPECTED_COUNTS` in the page source:

- **Vendors**: 6
- **Categories**: 5
- **Catalog Items**: 30
- **Purchase Orders**: 8
- **Assets**: 40

These are rendered as a row of count cards at the bottom of the page. When sample data is not loaded the cards are outlined and show the target count. When it is loaded the cards turn brand green and show the actual count currently in the database.

The dataset seeds realistic names and SKUs so that filters, search, and grouping all behave like a real deployment. The seed source lives under `src/lib/seed/` and is the same seeder used optionally at the end of the setup wizard.

## The toggle

The main control is a single ShadCN `Switch` labeled "Enable sample data" or "Sample data is active" depending on state.

- **Turning it on**: calls `POST /api/settings/sample-data` immediately. No confirm dialog. The call seeds the full dataset in a single transaction and returns when the commit completes. The processing overlay shows during the insert and the toast announces success.
- **Turning it off**: shows a confirm dialog first. The dialog says:

  > Remove Sample Data
  >
  > This will delete all sample data. Your real data will not be affected. This action cannot be undone.

  Clicking Remove triggers `DELETE /api/settings/sample-data`, which scans the tenant for rows tagged as sample data and deletes them in dependency order (assets, purchase order lines, purchase orders, items, categories, vendors).

The off toggle is purely a safeguard against accidental clicks. The underlying call would work without the confirm; the dialog is there because the action is irreversible.

## How sample data is identified

The seed function tags every row it creates with a stable marker (a naming convention on the id prefix or a metadata flag in a JSON column, depending on the model). The removal routine uses that same marker to find exactly the rows it inserted, which means:

- Real items you created yourself are never touched by Remove.
- Sample items that you then linked to real purchase orders are still detected as sample and removed; the linked order line cascade will handle the cleanup.
- Deleting sample data cannot leave orphaned references because the removal order respects foreign keys.

In practice the safest workflow is to load sample data on a fresh tenant, kick the tires, and remove it before you start entering real production data. Mixing the two is supported but not recommended.

## Loading state

When the page mounts it calls `GET /api/settings/sample-data`. The response returns `{ isLoaded: boolean, counts: SampleDataCounts }`. The UI uses this to decide whether to render the toggle as on or off and which counts to display in the cards.

A loading skeleton covers the cards and the switch while the initial status query is in flight. A processing overlay covers the whole card while an insert or delete is running, with a spinning icon and the label "Inserting sample data" or "Removing sample data".

## Idempotency

- Calling **load** when data is already loaded is a no op on the UI (the toggle is already on and the click is rejected). At the API layer, a second load will detect existing sample rows and skip insertion rather than doubling them.
- Calling **remove** when data is not loaded is also a no op.

This makes the endpoint safe to script against for automated demo resets.

## Use cases

The three main things sample data is for:

1. **Evaluation**. A prospect can stand up a fresh container, click through the setup wizard with `seedDemoData` turned on, and immediately see a populated dashboard. Or they can skip demo data in the wizard and add it later from this page.
2. **Training**. New operators can practice receiving, approving, and reporting against a deterministic dataset without touching production inventory.
3. **Screen recording and demos**. You can reset demo data between takes to get consistent screenshots.

If you need a non destructive demo environment (real data from production on a separate read only surface), that is a different problem. Spin up a second container with a copy of the database volume instead.

## Warnings

- Even though Remove is scoped to tagged sample rows, keep a backup of your database before running it the first time on a tenant that has real data mixed in. Trust but verify.
- Sample data does not create sample users. The only user on the tenant is whoever the setup wizard created. If you want extra test users, add them manually from `/settings/users`.
- Sample data does not include audit log entries; adding it produces real audit entries for the seed action, not synthesized history.
