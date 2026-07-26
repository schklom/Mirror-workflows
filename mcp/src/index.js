#!/usr/bin/env node
// openGym MCP server — stdio transport, read-only tools over a single user's state file.
//
// Spawning model (per the official MCP design): the LLM client (Claude Desktop, Cursor,
// Cline, …) starts this process locally, talks JSON-RPC over stdin/stdout, and tears it down
// when the session ends. That matches openGym's "your data stays in a folder you control"
// ethos — no extra container, no new outbound network, no third-party service.
//
// Env:
//   OPENGYM_DATA  directory containing db.json + state-<uid>.json (default: ./data)
//   OPENGYM_UID   which profile to answer for (default: auto-detect the single-user case)
//   OPENGYM_LANG  reserved for future label-localisation (default: en)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { TOOLS } from './tools.js'
import { init, getUser } from './state.js'

const server = new McpServer({
  name: 'opengym',
  version: '0.1.0'
})

// Initialise the state view up-front so a bad config (missing data dir, ambiguous uid) fails
// fast with a clear message on stderr rather than silently answering every tool call with the
// "no synced state" fallback. init() is idempotent — the LLM client restart is cheap.
try {
  init()
  // Always register every tool, regardless of whether state resolved — an LLM client that
  // learns the tool list at handshake should see all eight. The handlers themselves degrade
  // gracefully if state is null (returns the no-state sentinel object).
  const u = getUser()
  console.error(`[opengym-mcp] serving profile ${u.name} (${u.id})`)
} catch (e) {
  console.error(`[opengym-mcp] ${e.message}`)
  // Don't exit — keep the server up so the LLM client still gets tool listings and a useful
  // error if it tries to call one. Most issues are env-shaped (wrong OPENGYM_DATA path) and
  // a user will restart once they fix it; failing at handshake is more annoying than a clear
  // runtime error.
}

for (const t of TOOLS) {
  server.tool(
    t.name,
    t.description,
    t.schema,
    async (params) => {
      try {
        const result = t.handler(params || {})
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (err) {
        const code = err.code || 'ERROR'
        return {
          isError: true,
          content: [{ type: 'text', text: `${code}: ${err.message}` }]
        }
      }
    }
  )
}

const transport = new StdioServerTransport()
await server.connect(transport)
// Process stays alive serving JSON-RPC over stdio until the LLM client disconnects.
