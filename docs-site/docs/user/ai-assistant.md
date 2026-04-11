---
title: AI Assistant
sidebar_label: AI Assistant
---

The AI Assistant is a chat companion built into Shane-Inventory. Instead of clicking through pages and applying filters, you can simply ask a question in plain English and get an answer grounded in your live data.

## What you can do here

- Open a chat panel from anywhere in the app.
- Ask questions about your inventory, purchase orders, vendors, and assets.
- Get answers that are pulled from your current database in real time.
- See responses rendered with formatted HTML, including tables and lists.
- Scroll back through the conversation history for context.

## Opening the assistant

The AI Assistant lives in the top header bar of every page. Click the chat or sparkle icon (depending on your theme) to slide the chat panel open. You can keep working in the main page while the panel is visible; closing it preserves your conversation so you can reopen later and pick up where you left off.

## What kinds of questions can I ask?

The assistant understands natural language and is grounded in the same data you see in the app. You do not need to learn any special syntax. Here are some examples of the kinds of questions that work well:

- "How many UniFi access points do we have available?"
- "Which items are currently low on stock?"
- "What was the last price we paid for the Cisco Catalyst 9300?"
- "List the purchase orders we sent to Acme Networks in the last 30 days."
- "How many assets were received yesterday?"
- "Which vendors have pending orders?"
- "Show me all items from Ubiquiti."
- "What is the status of PO 1042?"

You can also ask follow-up questions. The assistant remembers the current thread, so you can drill down without having to restate context: "Now show me just the ones over $500," "What about from Acme?" and so on.

## How the assistant gets its answers

When you ask a question, the assistant looks up the answer directly in your live Shane-Inventory database. It does not rely on cached snapshots or training data about your company. That means:

- Answers reflect the current state of your inventory, not yesterday's.
- Anything you or a teammate just changed is available immediately.
- Numbers in the chat will match the numbers on the Dashboard, Inventory, and Procurement pages at the same moment in time.

If the assistant cannot find an answer (for example, you ask about an item that does not exist in the catalog), it will tell you plainly rather than make something up.

## Rich responses

The assistant renders its replies as formatted HTML, not just plain text. That means you can expect:

- **Tables** when you ask for a list of items, orders, or vendors.
- **Bulleted and numbered lists** for step-by-step answers or short summaries.
- **Bold and emphasis** on important numbers or status words.
- **Links** back into the app when the assistant is referring to a specific item, purchase order, or vendor.

Clicking a link in the chat will open that record in the main work area so you can keep investigating. This makes the assistant a great jumping-off point: ask a broad question, then click through to the specific records you care about.

## Conversation history

Every message you send and every reply you receive is kept in the conversation history for as long as the session is open. You can scroll back through earlier questions at any time. This is especially useful when you are working through a complex task, for example, planning a reorder or investigating a discrepancy; you can retrace your steps without losing any of the numbers you already gathered.

If you want to start fresh, look for a **New conversation** or **Clear** button in the chat panel. Starting a new conversation wipes the current context so the assistant treats your next question as a clean slate.

## Good questions, better answers

A few small habits will make your conversations with the assistant much more productive:

- **Be specific when it helps.** "How many UniFi access points are available?" is better than "How many access points?" if you have several manufacturers.
- **Use follow-ups.** Start broad, then narrow. This is faster than trying to write one perfect question.
- **Ask for formats.** "Show me as a table" or "Give me the top 5" are both valid.
- **Double-check critical numbers.** The assistant is accurate, but for anything that will drive a big decision (a large order, an audit response) it is worth spot-checking against the corresponding page in the app.

## Typical workflows

### "Quick stock check before a meeting."

1. Open the assistant from any page.
2. Ask, "How many of each UniFi product do we have in stock?"
3. Copy the table into your notes or keep the chat open during the meeting.

### "Investigating a low stock alert."

1. The Dashboard shows a low stock count.
2. Open the assistant and ask, "Which items are currently low on stock?"
3. Follow up with, "Which vendor did we last buy the first one from?"
4. Click through to the vendor to start a new purchase order.

### "Retracing a recent shipment."

1. Open the assistant.
2. Ask, "What assets were received in the last 24 hours?"
3. Click an asset link to open its detail page and trace it back to the purchase order line.

## Tips

- The assistant is always grounded in your live data, so it is safe to trust its numbers for day-to-day operations.
- If a reply looks wrong, rephrase the question. Small changes in wording can help the assistant find the right data.
- Use the assistant as a teaching tool. If you are new to the app, ask it to explain how a feature works (for example, "How do I receive a shipment?") and it will walk you through it.
