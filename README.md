# gaspar-mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for [Gaspar](https://gaspar.hidagama.com) — let Claude (or any MCP client: Cursor, Cody, Continue, …) draft and run email outreach campaigns on your Gaspar account.

## What it does

Exposes 12 tools that map 1:1 onto the Gaspar REST API:

| Tool | What |
|---|---|
| `list_accounts` | Connected Gmail/Outlook senders + daily headroom |
| `list_campaigns` | Your campaigns with honest open/click/reply stats |
| `get_campaign` | One campaign with full content + stats |
| `create_campaign` | New draft |
| `update_campaign` | Edit subject/body/sender/throttle on a draft |
| `add_recipients` | Add recipients (with merge fields) |
| `list_recipients` | Per-recipient send/open/click/reply state |
| `preview_campaign` | Render merged subject+body for the first recipient |
| `launch_campaign` | Start sending (requires `campaigns:launch` scope) |
| `pause_campaign` / `resume_campaign` | Mid-send control |
| `get_campaign_events` | Raw delivery events |

This server contains **zero business logic**. The send engine, tracking, suppression, throttling, and cron all run on Gaspar's servers — this is just a protocol adapter.

## Setup

1. **Get a Gaspar API key.** Sign in at [gaspar.hidagama.com](https://gaspar.hidagama.com), go to **Settings → API keys**, create a new key. The key starts with `gsk_` and is shown **exactly once** — store it immediately.

2. **Scopes.** By default, new keys get `campaigns:read` + `campaigns:write`. To let the agent autonomously send mail, also check **Launch** when creating the key. Without it, the agent can draft, preview, and queue everything except the final send.

3. **Add to Claude Desktop.** Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

   ```json
   {
     "mcpServers": {
       "gaspar": {
         "command": "npx",
         "args": ["-y", "gaspar-mcp"],
         "env": {
           "GASPAR_API_KEY": "gsk_..."
         }
       }
     }
   }
   ```

   Restart Claude Desktop. The Gaspar tools should appear in the slash-tool picker.

4. **Or use with Cursor / Continue / any MCP client** — point at the `gaspar-mcp` binary with `GASPAR_API_KEY` in env.

## A note for users of AI coding assistants

If you're driving the Gaspar REST API directly from an AI coding assistant (Claude Code, Cursor, Aider, Continue) — not via this MCP server, but with the assistant running raw `curl` or scripts — note that the assistant's shell is a **subprocess** that does not inherit env vars exported in your own terminal. `export GASPAR_API_KEY=…` in your terminal will not reach the assistant's Bash calls.

Fix:

```sh
echo 'export GASPAR_API_KEY="gsk_..."' > ~/.gaspar_env
chmod 600 ~/.gaspar_env
```

Then have the assistant prefix every Bash call with `source ~/.gaspar_env &&`. The key gets loaded into each command's environment without ever appearing in chat or a repo file. Delete `~/.gaspar_env` when you're done.

(This MCP server itself reads `GASPAR_API_KEY` from its own env block in `claude_desktop_config.json` — that path doesn't have the subprocess issue, since the assistant launches the MCP process with that env directly.)

## A safe-by-default workflow

Recommended prompt to give the agent: *"Draft a campaign for X to recipient list Y. Show me the preview. Don't launch — I'll review and launch myself."*

If you mint a key **without** `campaigns:launch`, the agent literally cannot send. It will draft, preview, and queue everything, then return a 403 on launch with a clear "missing scope" error you can read.

## Tenant isolation

Every API call filters by the key's owner. A key can never see another user's accounts, campaigns, or recipients.

## Revocation

Revoke from **Settings → API keys → Revoke** at any time. The next request with that key returns 401.

## License

MIT.

## Contributing

Issues + PRs welcome at [github.com/hidagama/gaspar-mcp](https://github.com/hidagama/gaspar-mcp).
