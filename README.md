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

Install once in your AI assistant's config. **Thirteen typed tools** appear in the tool picker — including a side-effect-free `auth_check` you should call first. Tell your assistant *"Draft a follow-up to every CES contact who opened my last email but didn't click — show me the preview, I'll launch."* That happens.

---

## Install

> **Note:** The `gaspar-mcp` npm package isn't published yet. Until it is, use the `github:hidagama/gaspar-mcp` install form below — it installs the same code directly from this repo and compiles on install via the `prepare` script. Identical functionality, slightly different one-line command.

### For Claude Code (CLI)

[Claude Code](https://claude.ai/code) uses a different config file than Claude Desktop. Use the `claude mcp add` helper instead of editing JSON:

```sh
# Mint your key first at https://gaspar.hidagama.com/settings, then export it:
export GASPAR_API_KEY="gsk_your_key_here"

# Install gaspar at user scope (works in every project — recommended):
claude mcp add gaspar --scope user -e GASPAR_API_KEY="$GASPAR_API_KEY" -- npx -y github:hidagama/gaspar-mcp
```

**⚠ CRITICAL: you must start a brand-new Claude Code conversation after running `claude mcp add`.** The server will show as `Connected` in your existing session (`claude mcp list` lies a bit here), but its tools won't appear in the tool inventory until session-start. The fastest verification: open a new chat and ask the assistant to call `auth_check`.

**On `--scope`:**
- `--scope user` (recommended for most users) — gaspar is available in every Claude Code project
- `--scope project` (default if you omit `--scope`) — gaspar is scoped to the current working directory; running `claude mcp get gaspar` from a different folder will say "no such server"
- `--scope local` — scoped to one specific session

### For Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on Windows / Linux:

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

**Quit and reopen Claude Desktop** (full quit, not just close window). The 13 Gaspar tools appear in the tool picker.

### For Cursor / Continue / Cody / other MCP clients

Same shape as Claude Desktop — point at the `gaspar-mcp` binary with `GASPAR_API_KEY` in env. Each client has its own config-file path; consult your client's MCP integration docs.

## Verify the install

Run the stdio probe yourself to confirm the server is alive and your key works, BEFORE wiring it into your assistant. This catches problems faster than restarting an MCP client to check.

```sh
# Replace gsk_... with your real key. The probe sends a minimal MCP handshake
# then calls auth_check and prints the response.
GASPAR_API_KEY="gsk_..." sh -c '
(printf "%s\n" \
  "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"probe\",\"version\":\"1.0\"}}}" \
  "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}" \
  "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"auth_check\",\"arguments\":{}}}";
  sleep 1
) | npx -y github:hidagama/gaspar-mcp 2>/dev/null | tail -1'
```

**Expected output:** a JSON-RPC response whose `result.content[0].text` is JSON containing `"ok": true`, your `user_id`, your granted `scopes`, and your `plan` tier.

**If you get `"ok": false` or HTTP 401** — the key is wrong, expired, revoked, or has zero scopes. Re-mint at [gaspar.hidagama.com/settings](https://gaspar.hidagama.com/settings).

**If you get a connection error** — the server didn't start. Check that Node ≥18 is installed and that `npx` can reach github.com.

## First-time workflow

The recommended call order for a new campaign — same order your AI assistant should follow when prompted to send outreach:

1. **`auth_check`** — verify the key + see which scopes are granted
2. **`list_accounts`** — pick a sender mailbox (need the `id` to pass to step 3)
3. **`create_campaign`** — start a draft with the chosen `gaspar_account_id`
4. **`add_recipients`** — bulk-add the audience with merge fields
5. **`preview_campaign`** — render subject + body for recipient #1, show the user
6. **`launch_campaign`** — start sending (requires `campaigns:launch` scope)

Tool descriptions in the server include these dependency hints inline so the assistant picks the right tool for the right step without manual prompting.

## What is Gaspar?

[**Gaspar**](https://gaspar.hidagama.com) is the cold-email outreach platform built by [DaGaMa Intelligence](https://hidagama.com). It sends from your own Gmail, Outlook, or custom-domain mailbox — never a shared sender pool — so recipients see *you*, replies land in *your* inbox, and your sender reputation stays *yours*. Honest open tracking, AI-assisted spam-risk analysis on every campaign, built-in mailbox warmup, native Meta Custom Audience push, and a complete REST API behind everything.

This MCP server lets an AI assistant drive that platform end-to-end. Compose campaigns, refine subject lines, add recipients, preview the merge, launch sends, triage replies, push leads to retargeting audiences. All through the assistant interface, all in plain language.

## API keys + scopes

Create a free account at [gaspar.hidagama.com/get-started](https://gaspar.hidagama.com/get-started). Connect your Gmail or Outlook mailbox via OAuth. Open [Settings → API keys](https://gaspar.hidagama.com/settings) and generate a new key. You'll get a `gsk_`-prefixed token shown exactly once — store it immediately.

| Scope | Permits |
|---|---|
| `campaigns:read` | List, read, preview, and inspect campaigns. Always on. |
| `campaigns:write` | Create draft campaigns, edit subject + body, add recipients, configure throttle. |
| `campaigns:launch` | Start actually sending mail. **Off by default.** Leave it off and the assistant can do everything except press send. |

The recommended workflow is **write-only** keys: let the assistant compose freely; you press the green button yourself. Best-of-both-worlds setup that keeps the irreversible action in your hands.

## The thirteen tools

Every tool maps 1:1 to a Gaspar REST endpoint. Schemas are typed; descriptions tell the assistant what each one does plainly.

| Tool | Purpose | Scope required |
|---|---|---|
| `auth_check` | **Call FIRST in any new session.** Side-effect-free auth diagnostic. Returns `{ok, user_id, scopes, plan}`. | `campaigns:read` |
| `list_accounts` | Connected Gmail / Outlook senders + daily send headroom. Call BEFORE `create_campaign`. | `campaigns:read` |
| `list_campaigns` | All campaigns with honest open / click / reply stats. | `campaigns:read` |
| `get_campaign` | One campaign — subject, body, sender, throttle, full stats. | `campaigns:read` |
| `create_campaign` | New draft. **Requires `gaspar_account_id` from `list_accounts`.** | `campaigns:write` |
| `update_campaign` | Edit any field on a draft. Use to iterate on subject lines. | `campaigns:write` |
| `add_recipients` | Bulk-add recipients with merge fields. Call AFTER `create_campaign`. | `campaigns:write` |
| `list_recipients` | Per-recipient send / open / click / reply state. | `campaigns:read` |
| `preview_campaign` | Render merged subject + body for recipient #1. **Always call before `launch_campaign`.** | `campaigns:read` |
| `launch_campaign` | **The irreversible one.** Requires `campaigns:launch` scope. | `campaigns:launch` |
| `pause_campaign` | Pause a sending campaign mid-flight. | `campaigns:write` |
| `resume_campaign` | Resume a paused campaign. | `campaigns:write` |
| `get_campaign_events` | Raw delivery events (sent, opened, clicked, bounced, replied, unsubscribed). | `campaigns:read` |

## What an AI assistant can actually do for you

Concrete workflows that *resolve in one prompt* once the MCP server is connected:

- **Iterate on a subject line until the spam-risk score clears 80.** The assistant uses `update_campaign` plus Gaspar's launch-time spam-check to converge.
- **Build a targeted follow-up campaign from a previous send.** *"Find every contact in the Hannover Messe campaign who opened but didn't reply, draft a 4-sentence follow-up that references the original subject, show me the preview."*
- **Personalize at scale.** *"Take this list of 47 LinkedIn contacts from my paste — match each name to the closest industry, draft per-recipient opening lines, add them as a campaign."*
- **Investigate a campaign that underperformed.** *"Pull the events for campaign Q1-pilot, summarise the open-vs-click ratio, country breakdown, and three best-performing subjects."*
- **Compose drafts on your phone, launch from your laptop.** With a write-only key (no launch scope), the assistant works during your commute; you press the send button in the dashboard when you sit down.

## Safety story

**Your API key never touches your shell history or your terminal env.** The key lives in the assistant's MCP config file (the `env` block inside `claude mcp add`, or the JSON config for Claude Desktop), gets passed as an environment variable when the assistant launches the MCP process, and is read inside the process. Nothing the assistant says, types, or commits ever exposes the key.

**Scopes prevent the assistant from sending mail you didn't approve.** A `campaigns:read` + `campaigns:write` key with no `campaigns:launch` scope literally cannot send. The assistant can draft, preview, edit, refine — but `launch_campaign` returns 403 with a clear scope-error. The send button stays in your hands.

**Tenant isolation is enforced server-side.** Every API call filters by the key's owner. A key for one Gaspar user cannot see another user's accounts, campaigns, or recipients.

**Revocation is immediate.** Open Settings → API keys → click Revoke. The next request with that key returns 401. No propagation delay, no caching.

**MIT-licensed source.** This repository contains the full MCP server source. No obfuscation, no proprietary binary, no closed protocol. You can audit, fork, or extend any of this freely.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `claude mcp list` shows `✓ Connected` but tools don't appear in the assistant's tool inventory | Mid-conversation MCP additions don't load tools into the running session | **Start a brand-new Claude Code conversation.** The tools appear at session start, not on `mcp add`. |
| `claude mcp get gaspar` says "no such server" from a different folder than where you ran `mcp add` | The default `--scope project` only installs gaspar in the current working directory | Re-install with `--scope user` to make it available everywhere |
| HTTP 401 / `auth_check` returns `ok: false` | Key is wrong, expired, revoked, or has zero scopes | Re-mint at [gaspar.hidagama.com/settings](https://gaspar.hidagama.com/settings) |
| HTTP 403 on `launch_campaign` | The key has `campaigns:read` + `campaigns:write` but not `campaigns:launch` | Mint a new key with launch scope checked, OR keep the write-only key and launch from the dashboard manually |
| `npx github:hidagama/gaspar-mcp` errors during install | Likely a Node version issue (need ≥18) or a corporate proxy blocking github.com | Check `node --version`; verify `npx -y github:hidagama/gaspar-mcp` runs in a plain shell outside your assistant |
| Server starts but immediately exits with "GASPAR_API_KEY env var is required" | Env var didn't reach the MCP subprocess | The MCP config `env` block is the right way to pass it. Don't rely on exporting in your shell — AI-assistant subprocesses don't inherit user-terminal env vars. |

## Frequently asked questions

### Does this only work with Claude Code and Claude Desktop?

No. It works with **every** Model Context Protocol-compatible client — Claude Code, Claude Desktop, Cursor, Continue, Cody, and a growing list of others. The setup pattern is identical: tell your client to run `npx github:hidagama/gaspar-mcp` with `GASPAR_API_KEY` in env. Specific config-file paths vary by client.

### What if I want to call the Gaspar API directly, without an MCP server?

Mint the same `gsk_` key and call `api.hidagama.com/api/gaspar/*` from any HTTP client — `curl`, Python, n8n, Make.com, Zapier, your CRM webhook. The REST API is documented at [gaspar.hidagama.com/how-to-use#api](https://gaspar.hidagama.com/how-to-use#api). The MCP path is purely a convenience for AI-assistant workflows; everything also works as a normal REST API.

### How is this different from connecting Gmail to Zapier?

Zapier and similar automation platforms work for one-way triggers — "when X happens, send a Y email." They struggle with the interactive, iterative pattern of cold-email composition: tweak subject, preview, A/B test, refine, then send. An AI assistant via MCP holds the whole campaign state in conversation context and iterates with you.

### Does Gaspar send from a shared server pool?

No — and that's the entire point of the platform. Every Gaspar campaign sends through your own Gmail or Outlook mailbox via OAuth. Your sender reputation stays yours, rises and falls on what you send, not on what other Gaspar customers send.

### Do I need a paid Gaspar account to use the MCP server?

A free trial works fine for evaluation. The 14-day trial caps at 50 sends per day and 700 sends total — plenty to wire up a workflow and test it end-to-end. Once you're sending real campaigns at volume, paid plans start at 1,000 emails per month. See [pricing](https://gaspar.hidagama.com/pricing).

### What data is shared with DaGaMa servers?

Whatever you'd send through Gaspar normally — campaign subject + body templates, recipient lists, merge fields. Same as if you'd typed them into the dashboard. The MCP server is a thin protocol adapter; it doesn't add a data path that the dashboard doesn't already use.

### Can I point this at a different Gaspar host?

The published version points at `api.hidagama.com`, which is the Gaspar service. `GASPAR_API_BASE` exists so the client can be aimed at a test host during development of this MCP server itself. Gaspar is a hosted service — there is no self-hosted edition.

### How do I report a bug or request a tool?

Open an issue on this repo. For Gaspar-platform bugs (campaign sending issues, deliverability problems, billing), email [hello@hidagama.com](mailto:hello@hidagama.com).

## Pairs with the rest of DaGaMa

This MCP server is part of [DaGaMa Intelligence](https://hidagama.com)'s product family:

- **[BoothBot](https://hidagama.com/boothbot)** — scan trade-show business cards via Telegram, WhatsApp, or WeChat. [How to use BoothBot →](https://hidagama.com/boothbot/how-to-use)
- **[SourceBot](https://hidagama.com/sourcebot)** — capture suppliers, product photos, and voice-noted price quotes at Canton Fair, Yiwu, Hannover Messe, or any sourcing show. [How to use SourceBot →](https://hidagama.com/sourcebot/how-to-use)
- **[ExpenseBot](https://hidagama.com/expensebot)** — snap business-travel receipts and get categorised expense rows ready for finance. [How to use ExpenseBot →](https://hidagama.com/expensebot/how-to-use)
- **[Cabral](https://cabral.hidagama.com)** — sourcing and quotation software for trading companies. Turn a customer's messy product file into a sourced, priced, trackable quotation, with supplier comparison and branded share links. Customer-facing mail from Cabral is delivered through Gaspar. [How to use Cabral →](https://cabral.hidagama.com/guide)
- **[Gaspar](https://gaspar.hidagama.com)** — the email outreach platform this MCP server connects to.

## Contributing

Pull requests welcome. Tool additions go in `src/index.ts`; each tool needs a clear description string with call-order hints so AI assistants pick the right one. The package is small enough (~280 lines of TypeScript) to read end-to-end before contributing.

If you're installing from a manual `git clone` instead of `npx`:

```sh
git clone https://github.com/hidagama/gaspar-mcp.git
cd gaspar-mcp
npm install            # also runs the prepare script → builds dist/
node dist/index.js     # or wire it into your MCP client
```

The `dist/` directory is gitignored — it's generated by `tsc` via the `prepare` script on every `npm install`.

## License

MIT. Use it, fork it, ship it inside your own product. The only thing not under MIT is the Gaspar API your key talks to — that's governed by [DaGaMa's Terms of Service](https://hidagama.com/terms).

## About DaGaMa

[DaGaMa Intelligence L.L.C.](https://hidagama.com) builds tools for B2B teams who meet their prospects in person — trade-show exhibitors, sourcing buyers, business travelers. We started with [BoothBot](https://hidagama.com/boothbot) scanning business cards at the show floor; [Gaspar](https://gaspar.hidagama.com) is the follow-up engine that turns those captures into real conversations. The MCP server you're reading the README of is one piece of that stack.

Find us at [hidagama.com](https://hidagama.com) · [hello@hidagama.com](mailto:hello@hidagama.com)

---

<div align="center">

**Ready to let your AI assistant run your cold outreach?**

[**Sign up for Gaspar →**](https://gaspar.hidagama.com/get-started) · [**Read the full guide →**](https://gaspar.hidagama.com/how-to-use) · [**See pricing →**](https://gaspar.hidagama.com/pricing)

</div>
