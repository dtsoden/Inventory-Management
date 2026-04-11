---
title: AI Insights
sidebar_label: AI Insights
---

# AI Insights

AI Insights is your at-a-glance procurement dashboard. The page is split into two clearly separated sections so you always know what you are looking at:

- **Top of the page: AI Observations.** Short, plain-English commentary written by an AI assistant about what the numbers show. This is the only AI-driven content on the page and it sits inside its own brand-colored card.
- **Bottom of the page: Live Data Metrics.** Six KPI tiles, four detail cards, and five CSV reports. Every number here is computed directly from your live database via SQL. No AI involvement, no inference, no guessing. A clear divider with the heading "Live Data Metrics" marks the boundary.

You will find the page at `/insights`. There are two ways in:

1. **Sidebar** on the left: click **AI Insights** (sparkle icon, directly under AI Assistant).
2. **Header bar** at the top: click the **AI Insights** button next to **AI Assistant**.

Both entry points are visible to administrators, managers, and purchasing managers. Warehouse staff do not see them.

## Live Data Metrics: the six tiles

Below the AI Observations section, you will find six KPI tiles. All six update together when you change the time window. The default window is the last 30 days; you can switch to 7, 60, or 90 from the selector at the top right.

- **Spend**: total value of approved purchase orders in the window, plus the percent change compared to the previous window of the same length. An up arrow in green is more spend than last period, a down arrow in red is less.
- **Open commitments**: how much money you have approved or submitted but not yet received. This is the pipeline of stuff on the way.
- **Average approval time**: how long purchase orders wait between submission and approval, on average. If this number is climbing, your approvers are falling behind.
- **Vendor concentration**: how much of your total spend is going to your top three vendors combined. A colored badge (green, yellow, or red) tells you whether the concentration is low, medium, or high risk. High concentration is fine if those vendors are reliable; it becomes a problem if one of them has a bad month.
- **On-time delivery**: the percent of orders that arrived on or before their expected date. A drop here usually means a vendor is slipping.
- **Reorder action needed**: the number of items that are below their reorder point AND do not already have a pending PO covering them. This is your short list of items that actually need attention today.

Every number on the page comes straight from your live database. If you just approved a PO and then hit the refresh button at the top of the page, you will see the Spend tile move immediately.

## AI Observations (top of page)

The AI Observations section sits at the very top of the page, inside a brand-colored card with an "AI-generated" badge. This is where an AI assistant writes a short paragraph or two of commentary on what it sees in your data. Every observation is a card with a title and a short body. Everything else on the page is deterministic SQL data, not AI.

The key control here is the **Insight style** dial in the top right. You have three choices, and it matters which one you pick.

### Just the numbers (default)

This is the safest mode. The AI is allowed to restate the numbers you already see on the tiles, in plain English, and that is it. It will not say "this probably means", it will not recommend anything, it will not guess causes. If you are writing a report to leadership or pasting text into an email, this is the mode to use. Whatever it says, the numbers back it up one for one.

### With context

This mode lets the AI include the risk classifications that are already built into the data. For example, if your vendor concentration is flagged as high risk, a "With context" observation may call that out in a sentence. It still will not predict the future or guess at causes. Use this mode when you want the AI to connect the tiles to the built-in risk labels, without any editorial opinion.

### Speculative

This is the brainstorming mode. The AI is allowed to propose possible causes for what it sees and suggest next actions. A yellow warning banner appears above the observations when this mode is on, and every card is tagged with a "Speculative" badge. The point of the warning is that in this mode, the AI is offering interpretation, not verified fact. A sentence like "the drop in on-time delivery may reflect a single vendor falling behind" is a hypothesis, not a measurement. It is a fine starting point for a conversation with your team; it is not a fine thing to quote in a board report.

Most of the time you will want to leave the dial on "Just the numbers". Dial up to "Speculative" when you are trying to figure out what to investigate next.

## Why you can trust the numbers

Every tile and every observation is grounded in the same snapshot of your live database. The AI never invents numbers. The way the system is built, the AI is handed a pre-computed summary and is not allowed to reference anything that is not in it. If you see a number in an AI observation, it came from the same source as the tile. If you see a reference to a specific vendor or item, that vendor or item exists in your database. The AI has no way to make up a name.

In the rare case that the model tries to slip in a fact that is not in the data, the system catches it before you see it. The guardrails are strongest on "Just the numbers" and loosen deliberately as you dial up, because that is the trade-off you are consciously making when you move the dial.

## CSV exports

At the bottom of the page are five download buttons. Each one produces a CSV that you can open in Excel or Google Sheets. None of the CSVs go through the AI; they are pure data pulls straight from the database. Use them when you want to sort, pivot, or share raw numbers.

- **Vendor Spend**: one row per vendor, with total spend and share of total.
- **Open Commitments**: one row per open PO, with vendor, value, and age.
- **PO Aging**: open POs bucketed by how old they are (0 to 7 days, 8 to 30, 31 to 60, 61 or more).
- **Asset Register**: one row per tracked asset, with status, assigned user, and last movement.
- **Reorder Candidates**: one row per item below its reorder point that is not already on order.

All five exports respect the time window you selected at the top of the page. If you switch to 90 days and then click Vendor Spend, you get 90 days of vendor spend.

## A few good habits

- **Default to "Just the numbers"** when you are pulling data for anyone who is not in the room with you. Save "Speculative" for working sessions.
- **Change the window, then refresh**. The numbers update when you change the period, but if you want to re-draw the AI observations, click the refresh button at the top right.
- **Reconcile big surprises with a CSV.** If a tile shows something you did not expect, download the matching CSV and scan the rows. That is almost always faster than re-asking the question in the AI Assistant.
- **Use it as an agenda.** The Reorder action needed tile plus the Vendor concentration tile is a solid 5-minute weekly check-in with your buyer.

## Common questions

**Can I share a direct link to a specific time window?** Not yet. Bookmarking `/insights` opens the page on its default 30-day window.

**Why does my on-time delivery tile say zero percent but I know orders arrived on time?** On-time delivery is only calculated for orders that have an expected delivery date recorded. Orders without an expected date are excluded from the percentage. If your team is not filling in expected dates at PO creation, the tile will look empty.

**Why is the "Reorder action needed" count smaller than the low stock count on the Dashboard?** The Dashboard shows every item below its reorder point. The Insights tile excludes items that already have a pending PO covering them, because those are already being handled. It is the shorter, more actionable list.

**Can I customize which KPIs show up?** Not from the UI. A developer can add new tiles; see the admin documentation for AI Insights.
