---
title: AI Insights
sidebar_label: AI Insights
---

# AI Insights

Path: `/insights`. Two entry points, both role gated to `ADMIN`, `MANAGER`, and `PURCHASING_MANAGER` (hidden from `WAREHOUSE_STAFF`):

1. **Sidebar**: "AI Insights" with the Sparkles icon, sitting directly under "AI Assistant".
2. **Header bar**: "AI Insights" button, placed immediately next to the "AI Assistant" button at the top right.

The Insights page is the procurement analytics surface for the tenant. It combines six deterministic KPI tiles, a set of AI-authored observations, and five one-click CSV exports. Every number on the page originates in SQL, never in the model. The AI layer exists only to write the prose around numbers that were computed server-side.

This doc is the architectural reference: what the tiles mean, how the AI pipeline is locked down against hallucination, where the code lives, and how to extend it.

## Source files

- `src/lib/insights/InsightsService.ts`: SQL aggregation into a typed `InsightsSnapshot` object. Pure server code, no AI.
- `src/lib/insights/InsightsObserver.ts`: OpenAI call, mode dispatch, JSON schema validation, reference verification.
- `src/app/api/insights/snapshot/route.ts`: `GET /api/insights/snapshot?days=30` returns the snapshot.
- `src/app/api/insights/observe/route.ts`: `POST /api/insights/observe` takes `{ snapshot, mode }` and returns `{ observations }`.
- `src/app/api/insights/exports/[type]/route.ts`: `GET /api/insights/exports/<type>?days=N` streams a CSV.
- `src/app/(authenticated)/insights/page.tsx`: the client page that composes all of the above.

## Page layout (separation of concerns)

The page is split into two visually distinct sections so a user can never confuse AI-generated content with deterministic data.

**Section 1, AI Observations (top of page):**

- Wrapped in a brand-colored border so it reads as the AI surface.
- Header carries an "AI-generated" pill badge, the page title "AI Observations", the "Insight style" dial, and the Generate button.
- This is the only AI-driven content on the entire page.

**Visual divider** with the heading "Live Data Metrics" separates the two sections, plus a one-line note: *"Everything below is computed directly from your live database via SQL. No AI involvement, no inference."*

**Section 2, Live Data Metrics (bottom of page):**

1. **KPI tile grid**: six deterministic tiles.
2. **Top vendors / Single-source risk / Spend by category / Reorder candidates**: four detail cards.
3. **Reports**: five CSV download buttons.

The header bar at the very top of the page (period selector + refresh button) controls both sections. Selecting a different period re-fetches the snapshot, which re-drives every tile AND invalidates any prior observations the AI produced for the old period.

## The six KPI tiles

All six are computed by `InsightsService.getSnapshot(tenantId, days)`. Every value is a SQL aggregation against live tenant data.

1. **Spend**. Total approved-PO value inside the current period, plus the percent change versus the previous period of equal length. A positive change shows an up arrow, negative a down arrow. The comparison baseline is computed inside the same query so the tile is always internally consistent.
2. **Open commitments**. Count and total value of orders that are approved or submitted but not yet fully received. This is the money you have committed but not yet spent. Used to feed the Open Commitments CSV export.
3. **Average approval time**. Mean and median hours between `DRAFT` to `PENDING_APPROVAL` submission and the final approve/reject decision. Also exposes `rejectionRatePercent` so managers can see how often approvers are pushing back.
4. **Vendor concentration**. Top 3 vendors' combined share of total spend, classified into a risk level (`low`, `medium`, `high`) by fixed thresholds in `InsightsService`. High concentration means you are exposed to a single vendor losing stock, raising prices, or going out of business. The risk badge on the tile shows the classification.
5. **On-time delivery**. Percent of received orders that arrived on or before their expected date, with a count of late orders and an average days-late figure. Orders without an expected date are excluded from the denominator.
6. **Reorder action needed**. Count of items currently below their `reorderPoint` that do NOT already have a pending PO covering them. This is the short list of items that actually need attention, not the full low-stock list.

Every tile reads from the same `InsightsSnapshot` object, so the KPI grid and every downstream observation are guaranteed to agree numerically.

## AI Observations and the Insight style dial

The "Insight style" dial has three positions. It is the single user-facing control that determines what the AI is allowed to say. It maps directly onto an `InsightMode` in `InsightsObserver.ts`.

| Dial label | Internal mode | Temperature | What the model may do |
| --- | --- | --- | --- |
| Just the numbers (default) | `strict` | 0 | Restate values from the snapshot in procurement language. No interpretation, no recommendations, no causes, no hedging words. |
| With context | `balanced` | 0.3 | Restate values AND reference the risk classifications (`riskLevel: low/medium/high`) already in the snapshot. No future prediction. No cause speculation. |
| Speculative | `speculative` | 0.7 | Restate values AND propose plausible causes or recommended next actions. Each card also gets a per-card "Speculative" badge, and the section shows a yellow warning banner above the cards. |

The default is `strict`. Every user has to consciously dial up to get speculation, and the UI makes the trade-off visible.

### Why temperature alone is not enough

Temperature controls sampling randomness but not what the model is allowed to say. That is why the mode also swaps the system prompt instructions, not just the temperature. In `strict` mode, the prompt explicitly forbids words like "likely", "probably", "consider", "recommend", "should", "may want to", and "might". A model at temperature 0 that was given the `speculative` prompt would still produce recommendations, just deterministically. We want both the sampling and the permitted vocabulary locked down, so we set both per mode.

## Hallucination guardrails

The Insights AI pipeline is locked down at four distinct layers. A hallucination would have to defeat all four to reach the user. This is the architectural contract.

```mermaid
flowchart TD
  A[Live tenant DB] --> B[Layer 1: SQL aggregation<br/>InsightsService.getSnapshot<br/>Strict typed InsightsSnapshot]
  B --> C[Layer 2: System prompt jail<br/>Mode-specific instructions<br/>Forbidden verbs, forbidden invention]
  C --> D[OpenAI model call<br/>Temperature per mode]
  D --> E[Layer 3: JSON schema validation<br/>observations, title, body, references, speculative]
  E -->|bad schema| X[Reject, no observations returned]
  E --> F[Layer 4: Reference verification<br/>Every references[] path resolved against snapshot]
  F -->|invalid path| G[Silently drop the path]
  F --> H[Observations delivered to UI]
```

### Layer 1: pre-computed data contract

`InsightsService` runs all aggregations in SQL against the live DB. The output is a strongly typed `InsightsSnapshot` object (see `src/lib/insights/InsightsService.ts` for the full interface). The model never sees raw rows, never sees the database, and never issues a tool call that could return unvetted data. By the time the model is invoked, every fact it could possibly cite is already computed and serialized.

This means the model has nothing to invent from. It cannot ask the DB a question; it can only rephrase the snapshot.

### Layer 2: system prompt jail

The system prompt (see `SYSTEM_PROMPT_BASE` in `InsightsObserver.ts`) contains a set of absolute rules that apply in every mode:

1. You may only reference values present in DATA. No vendor names, item names, dates, percentages, or dollar amounts that are not in DATA.
2. You must return a JSON object with the exact shape `{ observations: [...] }`.
3. Each observation must quote a specific field from DATA in the `references` array using dot notation (for example `topVendors[0].name` or `vendorConcentration.top3PercentOfSpend`).

On top of that base, each mode appends its own instructions. The `strict` mode forbids hedging verbs outright; the `balanced` mode allows the existing `riskLevel` classifications but forbids future prediction; the `speculative` mode permits causal language but still requires every speculation to trace back to a specific DATA field.

The prompt is the first line of defense against speculation leaking into the default experience.

### Layer 3: JSON output schema validation

`InsightsObserver` requests JSON output from the model and validates the parsed result before returning. The envelope must be `{ observations: [...] }`, and each observation must be a `{ title, body, references, speculative }` object where `title` and `body` are non-empty strings, `references` is an array of strings, and `speculative` is a boolean.

If the model returns a shape that does not match, the entire response is rejected. Partial or malformed responses never reach the UI. This is the defense against the model "breaking out" of the contract by returning freeform text or by restructuring the envelope.

### Layer 4: reference verification

The final layer is the one that actually makes hallucination cheap to catch. Every string in an observation's `references` array is resolved against the snapshot using dot-notation path lookup. If the path exists in the snapshot, it stays. If it does not, it is silently dropped from the observation's `references` array before the observation is delivered.

This is important for two reasons. First, it means the user never sees a reference pointing at a field that does not exist. Second, it creates an asymmetric cost for the model: citing a real field is free, citing a fabricated field just gets the citation stripped, so the incentive is to cite the real thing. In practice, the model is trained well enough that it almost never produces invalid paths in `strict` mode; the verification layer is the backstop for `speculative` mode, where the model is running hotter and has more room to drift.

### What the guardrails do NOT guarantee

The guardrails stop the model from inventing new facts. They do NOT stop the model from writing a sentence that is technically true but potentially misleading (for example, calling a 52 percent top-3 concentration "significant" in balanced mode, which is a judgment call). In `speculative` mode specifically, the point is to let the model offer a human interpretation, and the yellow banner tells the user that these observations are not verified by the data alone. Administrators should coach users to use `strict` for reporting to leadership and `speculative` for private brainstorming.

## Exports

Five CSV exports are available from the Exports section. Each is served by `GET /api/insights/exports/[type]?days=<N>` and streamed back as a CSV attachment. None of them go through the AI pipeline; they are pure SQL exports. The list:

1. **Vendor Spend**: one row per vendor with total spend, PO count, and share of total spend, inside the selected period.
2. **Open Commitments**: one row per PO that is approved or submitted but not yet fully received, with vendor, total value, and age.
3. **PO Aging**: one row per open PO bucketed by age (0-7, 8-30, 31-60, 61+ days since submission).
4. **Asset Register**: one row per tracked asset with current status, assigned user, and last movement date.
5. **Reorder Candidates**: one row per item below its reorder point that does not already have a pending PO covering it.

The exports are meant as the raw, sortable view that sits behind the KPI tiles. If a manager disagrees with a tile, the expectation is that they download the corresponding CSV and reconcile from there.

## Role gating

The "AI Insights" header button is rendered conditionally based on the caller's role. `ADMIN`, `MANAGER`, and `PURCHASING_MANAGER` see it. `WAREHOUSE_STAFF` does not. The API routes under `/api/insights/*` also enforce the role check server-side, so a warehouse user who navigates directly to `/insights` gets a 403 from every fetch even if they reach the page shell.

This is the same pattern as the rest of the procurement surface (see `admin/procurement-workflow`): UI gating for discoverability, API gating for security. Do not rely on the UI alone.

## Extending the snapshot

If you want to add a new KPI tile, the pattern is:

1. Add the computed field to `InsightsSnapshot` in `src/lib/insights/InsightsService.ts`. Keep it strictly typed.
2. Compute it in `getSnapshot()`, ideally in the same transaction as the existing aggregations so the tile is consistent with the rest of the snapshot.
3. Render the tile in `src/app/(authenticated)/insights/page.tsx`.
4. Optional: update the system prompt hint in `InsightsObserver.ts` if the new field is the kind of thing the model should cite. The reference verification layer will automatically accept the new dot-notation path because it resolves against whatever shape the snapshot actually has.

You do not need to touch the mode temperatures or the schema validator to add a new field. Both are field-agnostic.

## Troubleshooting

Common issues:

- **The page renders but every tile shows zero.** The snapshot is running but the tenant has no POs in the selected window. Widen the period to 90 days and re-check.
- **The header button does not appear.** The current user's role is `WAREHOUSE_STAFF` or a custom role that does not include insights. Change the role in `admin/settings-users`.
- **AI Observations section is empty.** The snapshot returned but the model call failed or returned an empty `observations` array. Check the browser network panel for the `/api/insights/observe` response. A common cause is an expired or missing OpenAI API key in `admin/settings-integrations`.
- **A reference in an observation card does not seem to line up.** The reference verification layer will have already dropped any fabricated paths, so any path you see in the UI does exist in the snapshot. Compare against the raw response from `/api/insights/snapshot?days=<N>` to confirm the number.
- **Speculative mode is too aggressive for our tenant.** That is expected. The default is `strict` precisely because `speculative` is meant to be a deliberate opt-in. Brief your users that `strict` is the source of truth and `speculative` is a brainstorming aid.
