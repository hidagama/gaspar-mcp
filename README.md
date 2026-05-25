<div align="center">

# Gaspar MCP server

**Email outreach + AI assistants. The Model Context Protocol server for Gaspar — DaGaMa's cold-email platform.**

[![MCP](https://img.shields.io/badge/MCP-compatible-mint?style=flat-square&labelColor=0D0D0D&color=00FF94)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=0D0D0D)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-43a047?style=flat-square&labelColor=0D0D0D)](https://nodejs.org)
[![Gaspar](https://img.shields.io/badge/Gaspar-by%20DaGaMa-FBBF24?style=flat-square&labelColor=0D0D0D)](https://gaspar.hidagama.com)

[gaspar.hidagama.com](https://gaspar.hidagama.com) · [Full how-to guide](https://gaspar.hidagama.com/how-to-use) · [Mint an API key](https://gaspar.hidagama.com/settings) · [hidagama.com](https://hidagama.com)

</div>

---

**Connect your AI assistant to [Gaspar](https://gaspar.hidagama.com) — DaGaMa's email outreach platform — and let it draft, preview, and send personalized cold-email campaigns from your own Gmail or Outlook inbox.** Every send happens through your real address, every reply lands in your real inbox, every campaign respects the spam-risk gate. The MCP server is a thin protocol adapter; the campaign engine, the deliverability tooling, the warmup pool, the Meta Custom Audience push — all of that runs on Gaspar's servers behind your `gsk_` API key.

Install once in your AI assistant's config. Twelve typed tools appear in the tool picker. Tell your assistant *"Draft a follow-up to every CES contact who opened my last email but didn't click — show me the preview, I'll launch."* That happens.

```json
{
  "mcpServers": {
    "gaspar": {
      "command": "npx",
      "args": ["-y", "github:hidagama/gaspar-mcp"],
      "env": { "GASPAR_API_KEY": "gsk_..." }
    }
  }
}
```

---

## What is Gaspar?

[**Gaspar**](https://gaspar.hidagama.com) is the cold-email outreach platform built by [DaGaMa Intelligence](https://hidagama.com). It sends from your own Gmail, Outlook, or custom-domain mailbox — never a shared sender pool — so recipients see *you*, replies land in *your* inbox, and your sender reputation stays *yours*. Honest open tracking, AI-assisted spam-risk analysis on every campaign, built-in mailbox warmup, native Meta Custom Audience push, and a complete REST API behind everything.

This MCP server lets an AI assistant (Claude Desktop, Cursor, Continue, Cody, and every other Model Context Protocol-compatible client) drive that platform end-to-end. Compose campaigns, refine subject lines, add recipients, preview the merge, launch sends, triage replies, push leads to retargeting audiences. All through the assistant interface, all in plain language.

## Why this exists

Cold outreach is one of the highest-leverage workflows in B2B sales — and one of the most under-automated. The bottleneck has always been the writing: the messaging, the personalization, the iteration on subject lines until reply rates start moving. AI assistants are excellent at exactly that. The missing piece was the bridge between *"the assistant can write the email"* and *"the assistant can actually run the campaign."*

This MCP server is that bridge. It wraps the Gaspar REST API as twelve typed Model Context Protocol tools. Your AI assistant gets first-class schemas, your API key never touches the assistant's shell history or your terminal env, and you keep humans-in-the-loop on the only action that actually costs money: `launch_campaign`.

## Quick start

### 1. Get a Gaspar account and mint an API key

Create a free account at [gaspar.hidagama.com/get-started](https://gaspar.hidagama.com/get-started). Connect your Gmail or Outlook mailbox via OAuth. Open [Settings → API keys](https://gaspar.hidagama.com/settings) and generate a new key. You'll get a `gsk_`-prefixed token shown exactly once — store it immediately.

**Scopes** (pick what you want the AI assistant to be allowed to do):

| Scope | Permits |
|---|---|
| `campaigns:read` | List, read, preview, and inspect campaigns. Always on. |
| `campaigns:write` | Create draft campaigns, edit subject + body, add recipients, configure throttle. |
| `campaigns:launch` | Start actually sending mail. **Off by default.** Leave it off and the assistant can do everything except press send. |

The recommended workflow is **write-only** keys: let the assistant compose freely; you press the green button yourself. Best-of-both-worlds setup that takes the irreversible action out of the assistant's hands.

### 2. Add the MCP server to your assistant

Paste this into `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS Claude Desktop) or the equivalent config for your MCP client:

```json
{
  "mcpServers": {
    "gaspar": {
      "command": "npx",
      "args": ["-y", "github:hidagama/gaspar-mcp"],
      "env": {
        "GASPAR_API_KEY": "gsk_paste_your_key_here"
      }
    }
  }
}
```

Restart the assistant. Twelve Gaspar tools appear in the tool picker.

### 3. Drive a campaign in plain language

A prompt like *"Draft a follow-up to every CES contact who opened the last email but didn't reply, in my voice, low-pressure, single CTA"* now resolves end-to-end. The assistant lists your campaigns, finds CES contacts with opens-but-no-reply, drafts the email, calls `preview_campaign` so you can verify the merge, and waits for you to launch.

The Gaspar dashboard at [gaspar.hidagama.com/app](https://gaspar.hidagama.com/app) shows everything the assistant just did — same campaign rows, same recipient list, same drafts. You can take over from the UI any time.

## The twelve tools

Every tool maps 1:1 to a Gaspar REST endpoint. Schemas are typed; descriptions tell the assistant what each one does plainly.

| Tool | Purpose | Scope required |
|---|---|---|
| `list_accounts` | Show connected Gmail / Outlook sender mailboxes and their daily send headroom. | `campaigns:read` |
| `list_campaigns` | Every campaign with honest open / click / reply stats. | `campaigns:read` |
| `get_campaign` | Full campaign — subject, HTML body, sender, throttle, stats. | `campaigns:read` |
| `create_campaign` | New draft. Subject, body, sender, throttle, schedule. | `campaigns:write` |
| `update_campaign` | Edit any field on a draft. The assistant uses this to iterate on subject lines. | `campaigns:write` |
| `add_recipients` | Add recipients to a draft. Each recipient is an object with email + merge fields. | `campaigns:write` |
| `list_recipients` | Per-recipient send / open / click / reply state. | `campaigns:read` |
| `preview_campaign` | Render the merged subject + body for the first recipient. Use BEFORE launching. | `campaigns:read` |
| `launch_campaign` | Start sending. **Requires `campaigns:launch` scope** — keys without it return 403. | `campaigns:launch` |
| `pause_campaign` | Pause a sending campaign mid-flight. | `campaigns:write` |
| `resume_campaign` | Resume a paused campaign. | `campaigns:write` |
| `get_campaign_events` | Raw delivery events (sent, opened, clicked, bounced, replied, unsubscribed). | `campaigns:read` |

## What an AI assistant can actually do for you

Concrete workflows that *resolve in one prompt* once the MCP server is connected:

- **Iterate on a subject line until the spam-risk score clears 80.** *"Rewrite the subject of campaign Q2-outreach with three variants, run the spam-risk check on each, pick the highest-scoring one."* The assistant uses `update_campaign` + the launch-time spam-check to converge.
- **Build a targeted follow-up campaign from a previous send.** *"Find every contact in the Hannover Messe campaign who opened but didn't reply, draft a 4-sentence follow-up that references the original subject, show me the preview."*
- **Personalize at scale.** *"Take this list of 47 LinkedIn contacts from my paste — match each name to the closest industry, draft per-recipient opening lines, add them as a campaign."*
- **Investigate a campaign that underperformed.** *"Pull the events for campaign Q1-pilot, summarise the open-vs-click ratio, country breakdown, and three best-performing subjects."*
- **Compose drafts on your phone, launch from your laptop.** With a write-only key (no launch scope), the assistant works during your commute; you press the send button in the dashboard when you sit down.

## Safety story

**Your API key never touches your shell history or your terminal env.** The key lives in the assistant's MCP config file (typically `claude_desktop_config.json`), gets passed as an environment variable when the assistant launches the MCP process, and is read inside the process. Nothing the assistant says, types, or commits ever exposes the key.

**Scopes prevent the assistant from sending mail you didn't approve.** A `campaigns:read` + `campaigns:write` key with no `campaigns:launch` scope literally cannot send. The assistant can draft, preview, edit, refine — but `launch_campaign` returns 403 with a clear scope-error. The send button stays in your hands.

**Tenant isolation is enforced server-side.** Every API call filters by the key's owner. A key for one Gaspar user cannot see another user's accounts, campaigns, or recipients. Verified with explicit tests.

**Revocation is immediate.** Open Settings → API keys → click Revoke. The next request with that key returns 401. No propagation delay, no caching.

**MIT-licensed source.** This repository contains the full MCP server source. No obfuscation, no proprietary binary, no closed protocol. The Gaspar REST API itself is documented at [gaspar.hidagama.com/how-to-use#api](https://gaspar.hidagama.com/how-to-use#api). You can audit, fork, or extend any of this freely.

## Pairs with the rest of DaGaMa

This MCP server is part of [DaGaMa Intelligence](https://hidagama.com)'s product family. If your AI workflow includes trade-show capture, supplier sourcing, or expense tracking, the same conversational pattern works across the rest of the stack:

- **[BoothBot](https://hidagama.com/boothbot)** — scan trade-show business cards via Telegram, WhatsApp, or WeChat. Every contact lands in a Google Sheet within 30 seconds. [How to use BoothBot →](https://hidagama.com/boothbot/how-to-use)
- **[SourceBot](https://hidagama.com/sourcebot)** — capture suppliers, product photos, and voice-noted price quotes at Canton Fair, Yiwu, Hannover Messe, or any sourcing show. [How to use SourceBot →](https://hidagama.com/sourcebot/how-to-use)
- **[ExpenseBot](https://hidagama.com/expensebot)** — snap business-travel receipts via Telegram or the dashboard, get categorised expense rows ready for finance. First month included free with any paid BoothBot or SourceBot plan. [How to use ExpenseBot →](https://hidagama.com/expensebot/how-to-use)
- **[Gaspar](https://gaspar.hidagama.com)** — the email outreach platform this MCP server connects to. Send from Gmail, Outlook, or your own domain. Honest open tracking. AI spam-risk gate. Mailbox warmup. Native Meta Custom Audience push.

Each is its own product with its own pricing, but they share the same Drive Sheet model — your data lives in a Google Sheet you own, in your Drive, regardless of whether you keep paying.

## Frequently asked questions

### Does this only work with Claude Desktop?

No. It works with **every** Model Context Protocol-compatible client. That includes Claude Desktop, Cursor, Continue, Cody, and a growing list of others. The setup is identical — the `command` + `args` + `env` block in their MCP config file.

### What if I want to call the Gaspar API directly, without an MCP server?

Mint the same `gsk_` key and call `api.hidagama.com/api/gaspar/*` from any HTTP client — `curl`, Python, n8n, Make.com, Zapier, your CRM webhook. The REST API is documented at [gaspar.hidagama.com/how-to-use#api](https://gaspar.hidagama.com/how-to-use#api). The MCP path is purely a convenience for AI-assistant workflows; everything also works as a normal REST API.

### How is this different from connecting Gmail to Zapier?

Zapier and similar automation platforms work for one-way triggers — "when X happens, send a Y email." They struggle with the interactive, iterative pattern of cold-email composition: tweak subject, preview, A/B test, refine, then send. An AI assistant via MCP holds the whole campaign state in conversation context and iterates with you. It also opens up workflows that are impossible to express in trigger-action graphs, like *"summarise reply patterns from the last three campaigns and suggest what to change in the next one."*

### Does Gaspar send from a shared server pool?

No — and that's the entire point of the platform. Every Gaspar campaign sends through your own Gmail or Outlook mailbox via OAuth. Recipients see your real address. Replies land in your inbox. Your sender reputation stays yours, rises and falls on what you send, not on what other Gaspar customers send. Tools that route through shared sending servers train your customers to associate your domain with whoever else uses that server — Gaspar is the opposite.

### Do I need a paid Gaspar account to use the MCP server?

A free trial works fine for evaluation. The 14-day trial caps at 50 sends per day and 700 sends total — plenty to wire up a workflow and test it end-to-end. Once you're sending real campaigns at volume, paid plans start at 1,000 emails per month. See [pricing](https://gaspar.hidagama.com/pricing).

### What data is shared with DaGaMa servers?

Whatever you'd send through Gaspar normally — campaign subject + body templates, recipient lists, merge fields. Same as if you'd typed them into the dashboard. The MCP server is a thin protocol adapter; it doesn't add a data path that the dashboard doesn't already use. Your Gmail OAuth tokens stay encrypted at rest with AES-GCM. No content from your real customer emails (outside of campaigns you launched through Gaspar) ever touches our infrastructure.

### Can I run this against a self-hosted Gaspar?

The published version points at `api.hidagama.com`. To target a different host, set `GASPAR_API_BASE` in the env block alongside `GASPAR_API_KEY`. Useful for staging environments or self-hosted forks.

### How do I report a bug or request a tool?

Open an issue on this repo. For Gaspar-platform bugs (campaign sending issues, deliverability problems, billing), email [hello@hidagama.com](mailto:hello@hidagama.com).

## Contributing

Pull requests welcome. Tool additions go in `src/index.ts`; each tool needs a clear description string so AI assistants can pick the right one for a given user prompt. The package is small enough (~250 lines of TypeScript) to read end-to-end before contributing.

## License

MIT. Use it, fork it, ship it inside your own product. The only thing not under MIT is the Gaspar API your key talks to — that's governed by [DaGaMa's Terms of Service](https://hidagama.com/terms).

## About DaGaMa

[DaGaMa Intelligence L.L.C.](https://hidagama.com) builds tools for B2B teams who meet their prospects in person — trade-show exhibitors, sourcing buyers, business travelers. We started with [BoothBot](https://hidagama.com/boothbot) scanning business cards at the show floor; [Gaspar](https://gaspar.hidagama.com) is the follow-up engine that turns those captures into real conversations. The MCP server you're reading the README of is one piece of that stack.

Find us at [hidagama.com](https://hidagama.com) · [Twitter / X @hidagama](https://twitter.com/hidagama) · [LinkedIn](https://www.linkedin.com/company/hidagama) · [hello@hidagama.com](mailto:hello@hidagama.com)

---

<div align="center">

**Ready to let your AI assistant run your cold outreach?**

[**Sign up for Gaspar →**](https://gaspar.hidagama.com/get-started) · [**Read the full guide →**](https://gaspar.hidagama.com/how-to-use) · [**See pricing →**](https://gaspar.hidagama.com/pricing)

</div>
