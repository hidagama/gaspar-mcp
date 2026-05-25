#!/usr/bin/env node
/**
 * Gaspar MCP Server
 *
 * Wraps the Gaspar REST API at api.hidagama.com/api/gaspar/* so any
 * MCP-aware client (Claude Desktop, Cursor, Continue, Cody, etc.) can
 * drive campaigns end-to-end.
 *
 * Auth: a `gsk_`-prefixed Gaspar API key in env var GASPAR_API_KEY.
 * Mint a key at https://gaspar.hidagama.com/settings.
 *
 * Scopes determine what the agent can actually do — a key without
 * `campaigns:launch` will get a clean 403 on launch_campaign, which the
 * MCP client surfaces back to the user.
 *
 * This server contains NO business logic. Every tool is a thin pass-through
 * to the REST API. The send engine, tracking, suppression, throttling, and
 * cron all run server-side and fire regardless of who triggered the launch.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = process.env.GASPAR_API_BASE ?? 'https://api.hidagama.com/api/gaspar';
const API_KEY  = process.env.GASPAR_API_KEY;

if (!API_KEY) {
  console.error('[gaspar-mcp] GASPAR_API_KEY env var is required. Mint a key at https://gaspar.hidagama.com/settings');
  process.exit(1);
}
if (!API_KEY.startsWith('gsk_')) {
  console.error('[gaspar-mcp] GASPAR_API_KEY must start with "gsk_". Browser session JWTs are not accepted.');
  process.exit(1);
}

interface RestResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

async function rest(path: string, opts: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<RestResponse> {
  const method = opts.method ?? 'GET';
  let url = `${API_BASE}${path}`;
  if (opts.query && Object.keys(opts.query).length) {
    url += `?${new URLSearchParams(opts.query).toString()}`;
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* leave as text */ }
  return { ok: res.ok, status: res.status, body: parsed };
}

function asToolResult(r: RestResponse): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } {
  const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body, null, 2);
  if (!r.ok) {
    return {
      isError: true,
      content: [{ type: 'text', text: `HTTP ${r.status}\n${text}` }],
    };
  }
  return { content: [{ type: 'text', text }] };
}

const server = new Server(
  { name: 'gaspar-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// ────────────────────────────────────────────────────────────────────────────
// Tool catalogue
// ────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_accounts',
    description: 'List the Gmail/Outlook sender accounts connected to this Gaspar user. Returns id, email, display name, status, daily send headroom. Use this first to pick a sender for a new campaign.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_campaigns',
    description: 'List campaigns owned by this user with their honest open/click/reply stats. Status values: draft, scheduled, sending, sent, paused.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_campaign',
    description: 'Fetch a single campaign with subject, HTML body, sender, throttle, and full stats.',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: { type: 'string', description: 'UUID of the campaign' } },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_campaign',
    description: 'Create a new draft campaign. Returns the new campaign id. Subject and body can be set here or via update_campaign. Throttle defaults to 30/hour.',
    inputSchema: {
      type: 'object',
      properties: {
        name:              { type: 'string', description: 'Internal label for this campaign' },
        gaspar_account_id: { type: 'string', description: 'id from list_accounts — which mailbox sends' },
        subject:           { type: 'string' },
        body_html:         { type: 'string', description: 'HTML body. Plain text is auto-derived.' },
        from_name:         { type: 'string', description: 'Display name shown in the From header' },
        from_email:        { type: 'string', description: 'Alias to send from. Must be a verified Gmail alias on the chosen account, or omit to use the account default.' },
        reply_to:          { type: 'string', description: 'Where replies go. Defaults to from_email if not set.' },
        cc_emails:         { type: 'string', description: 'Comma-separated CC addresses applied to every recipient. Use sparingly.' },
        bcc_emails:        { type: 'string', description: 'Comma-separated BCC addresses applied to every recipient. Use sparingly.' },
        throttle_per_hour: { type: 'number', description: 'Max sends per hour. Default 30. Personal Gmail caps around 500/day.' },
      },
      required: ['name', 'gaspar_account_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_campaign',
    description: 'Update fields on an existing draft campaign — subject, body HTML, from-name, alias, reply-to, CC/BCC, throttle. Use this iteratively while designing the campaign with the user.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id:       { type: 'string' },
        name:              { type: 'string' },
        subject:           { type: 'string' },
        body_html:         { type: 'string' },
        from_name:         { type: 'string' },
        from_email:        { type: 'string' },
        reply_to:          { type: 'string' },
        cc_emails:         { type: 'string' },
        bcc_emails:        { type: 'string' },
        throttle_per_hour: { type: 'number' },
      },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_recipients',
    description: 'Add recipients to a draft campaign. Each recipient is an object with at least an `email` field; any other fields become merge variables available in {{placeholders}}. Returns how many were inserted vs deduplicated.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        recipients:  {
          type: 'array',
          items: {
            type: 'object',
            properties: { email: { type: 'string' } },
            required: ['email'],
            additionalProperties: true,
          },
          description: 'Array of recipient objects. Required field: email. Additional fields (first_name, company, etc.) are merged into the body via {{first_name}}, {{company}}.',
        },
      },
      required: ['campaign_id', 'recipients'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_recipients',
    description: 'List recipients on a campaign with their per-recipient send/open/click/reply state. Useful for diagnosing why specific addresses did not engage.',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'preview_campaign',
    description: 'Render the merged subject+body for the first recipient. Use BEFORE launch_campaign so the user can verify the merge fields look right.',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'launch_campaign',
    description: 'Start sending a campaign. REQUIRES the campaigns:launch scope on the API key — keys without it get a 403. The send engine then enqueues recipients at the campaign throttle. Always preview_campaign first and surface the rendered output to the user for explicit go-ahead before calling this.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id:  { type: 'string' },
        local_hour:   { type: 'number', description: 'If set, queues each recipient for this hour in their local timezone (0-23). Omit for "send now".' },
      },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'pause_campaign',
    description: 'Pause a sending campaign. Already-enqueued recipients for the current minute will still send; subsequent ticks stop.',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'resume_campaign',
    description: 'Resume a paused campaign.',
    inputSchema: {
      type: 'object',
      properties: { campaign_id: { type: 'string' } },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_campaign_events',
    description: 'Fetch raw delivery events (sent, opened, clicked, bounced, replied, unsubscribed) for a campaign. Use for deep analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        limit:       { type: 'number', description: 'Max events to return (server-capped).' },
      },
      required: ['campaign_id'],
      additionalProperties: false,
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, unknown>;

  try {
    switch (name) {
      case 'list_accounts':
        return asToolResult(await rest('/accounts'));
      case 'list_campaigns':
        return asToolResult(await rest('/campaigns'));
      case 'get_campaign':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}`));
      case 'create_campaign': {
        const { name: campName, ...rest_body } = a;
        return asToolResult(await rest('/campaigns', { method: 'POST', body: { name: campName, ...rest_body } }));
      }
      case 'update_campaign': {
        const { campaign_id, ...patch } = a;
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(campaign_id))}`, { method: 'PATCH', body: patch }));
      }
      case 'add_recipients':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/recipients`, { method: 'POST', body: { recipients: a.recipients } }));
      case 'list_recipients':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/recipients`));
      case 'preview_campaign':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/preview`));
      case 'launch_campaign': {
        const body: Record<string, unknown> = {};
        if (typeof a.local_hour === 'number') body.local_hour = a.local_hour;
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/launch`, { method: 'POST', body }));
      }
      case 'pause_campaign':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/pause`, { method: 'POST' }));
      case 'resume_campaign':
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/resume`, { method: 'POST' }));
      case 'get_campaign_events': {
        const query: Record<string, string> = {};
        if (typeof a.limit === 'number') query.limit = String(a.limit);
        return asToolResult(await rest(`/campaigns/${encodeURIComponent(String(a.campaign_id))}/events`, { query }));
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    if (err instanceof McpError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: 'text', text: `gaspar-mcp error: ${msg}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[gaspar-mcp] ready · API base: ' + API_BASE);
