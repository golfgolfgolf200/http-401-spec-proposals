# @x401/mcp-proxy

Zero-trust cryptographic delegation and operational boundary control proxy for Model Context Protocol (MCP) servers, implementing the RFC-x401-01 standard.

## Overview

The `@x401/mcp-proxy` safeguards MCP servers against prompt injection, unconstrained tool execution, and financial leakage by requiring human-signed, single-use x401 Delegation Tickets.

While baseline identity specifications (for example Proof x401) verify who stands behind an agent via OpenID4VP, this proxy enforces what that agent is permitted to touch:

- Tool allowlists and denylists (`allowed_actions`, `denied_actions`): intercepts `tools/call` and blocks unapproved method invocations.
- Deterministic replay defense: enforces single-use challenge nonces with automatic atomic invalidation.
- Zero-trust introspection: passes harmless discovery methods (`initialize`, `ping`, `tools/list`, `resources/list`) through freely while sandboxing high-impact execution.
- RFC 8785 JSON canonicalization: eliminates cross-language signature mismatches using byte-level deterministic validation.

## Installation

```bash
# Install globally for CLI usage
npm install -g @x401/mcp-proxy

# Or install locally in your project
npm install @x401/mcp-proxy
```

## Usage

### 1. Command-line process wrapper (stdio mode)

Wrap any standard stdio MCP server without altering its source code. This is ideal for desktop agent clients such as Claude Desktop, Cursor, or Zed.

```bash
npx @x401/mcp-proxy --server-origin https://auth.x401.tech -- <server-command> [args...]
```

Example: wrapping the filesystem MCP server.

```bash
npx @x401/mcp-proxy --server-origin https://auth.x401.tech -- npx -y @modelcontextprotocol/server-filesystem /path/to/directory
```

### Claude Desktop configuration

```json
{
  "mcpServers": {
    "filesystem-protected": {
      "command": "npx",
      "args": [
        "@x401/mcp-proxy",
        "--server-origin",
        "https://auth.x401.tech",
        "--",
        "npx",
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/safe/workspace"
      ]
    }
  }
}
```

### 2. Programmatic middleware (HTTP / edge gateways)

Directly embed `X401McpInterceptor` into your HTTP or stream-based MCP services (Hono, Express, Node HTTP).

```ts
import { Hono } from "hono";
import { X401McpInterceptor } from "@x401/mcp-proxy";

const app = new Hono();

const interceptor = new X401McpInterceptor({
  serverOrigin: "https://auth.x401.tech",
  challengeTtlSeconds: 300,
  allowedIssuers: new Set([
    "did:proof:usr_8921f00b92ea402",
    "https://auth.proof.com/.well-known/proof-client.json"
  ])
});

app.post("/mcp", async (c) => {
  const rpcMessage = await c.req.json();
  const verdict = await interceptor.interceptRequest(rpcMessage);

  if (!verdict.allowed) {
    return c.json(verdict.rpcResponse, 401);
  }

  const result = await executeTool(verdict.sanitizedRequest);
  return c.json(result);
});

export default app;
```

## Wire protocol and mechanics

```text
Client (Agent)      x401-mcp-proxy        Upstream MCP Server
      |                   |                          |
      | 1. tools/call     |                          |
      |----------------------------------------->|
      |<--2. JSON-RPC 401------------------------|
      |     (with challenge & nonce)             |
      |                                          |
      | [Agent obtains principal sign-off]      |
      |                                          |
      | 3. tools/call + ticket                  |
      |----------------------------------------->|  4. Verify sig & invalidate nonce
      |                                          |  5. Check tool allowlist
      |                                          |  6. Forward sanitized RPC call
      |                                          |<--7. Tool execution result--
      |<--8. JSON-RPC 200 (Success)--------------|
```

## 1. Challenge response (`HTTP` / `RPC` 401)

When an agent attempts a `tools/call` without an authorized ticket, `@x401/mcp-proxy` intercepts the call and returns:

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "error": {
    "code": 401,
    "message": "X401_AUTHENTICATION_REQUIRED",
    "data": {
      "error": "Delegation Ticket Required",
      "reason": "No x401 delegation ticket provided in params._meta",
      "target_tool": "write_file",
      "server_origin": "https://auth.x401.tech",
      "challenge": {
        "nonce": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "schema_uri": "https://x401.tech/schemas/v1/agent-delegation-ticket.json",
        "accepted_algorithms": ["ES256"],
        "expires_in_seconds": 300
      }
    }
  }
}
```

## 2. Providing delegation proof

The agent re-executes the call, supplying the signed ticket inside `params._meta.x401_ticket` (as a Base64URL string or raw JSON):

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "write_file",
    "arguments": {
      "path": "/safe/workspace/report.txt",
      "content": "Operational report data."
    },
    "_meta": {
      "x401_ticket": "eyJ4NDAxX3ZlcnNpb24iOiIxLjAuMCIsInRpY2tldF9pZCI6IjEy..."
    }
  }
}
```

## Configuration policy options

When creating an `X401McpInterceptor`, configure the following properties:

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `serverOrigin` | `string` | Yes | The canonical URI or identifier representing your MCP server (for example `https://auth.x401.tech` or `mcp://filesystem`). |
| `challengeTtlSeconds` | `number` | No | Expiration window for issued challenge nonces (default: `300` seconds). |
| `allowedIssuers` | `Set<string>` | No | Optional whitelist of approved principal/authority DIDs. If omitted, any validly signed ticket is evaluated. |
| `defaultMaxSpendPerAction` | `number` | No | Upper financial spending ceiling per action if executing monetized tools. |
| `currency` | `string` | No | Currency denomination for financial constraints (for example `"USDC"`, `"USD"`). |

## Standards and schema resources

- Specification: RFC-x401-01 Formal Specification
- Canonical JSON schema: `agent-delegation-ticket.json`
- Interactive token debugger: x401 Token Debugger

## License

Apache-2.0. Authored by [Josh Hart](mailto:contactx401.tech@gmail.com).
