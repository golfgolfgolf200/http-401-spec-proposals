import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  verifyX401Ticket,
  type X401DelegationTicket,
  X401VerificationError
} from "@x401/verifier";

// Initialize local SQLite nonce storage
const db = new DatabaseSync("./nonces.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS active_nonces (
    nonce TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_nonces_expiry ON active_nonces(expires_at);
`);

const stmtInsert = db.prepare(
  "INSERT INTO active_nonces (nonce, created_at, expires_at) VALUES (?, ?, ?)"
);
// Atomic burn: validates validity/expiry and deletes in a single operation
const stmtAtomicBurn = db.prepare(
  "DELETE FROM active_nonces WHERE nonce = ? AND expires_at >= ? RETURNING nonce"
);
// Pruning statement for expired unredeemed nonces
const stmtPruneExpired = db.prepare(
  "DELETE FROM active_nonces WHERE expires_at < ?"
);

// Sweep expired nonces every 60 seconds
setInterval(() => {
  try {
    const now = Math.floor(Date.now() / 1000);
    stmtPruneExpired.run(now);
  } catch (err) {
    console.error("[x401-gateway] Error during nonce sweep:", err);
  }
}, 60000).unref();

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "PROOF-RESPONSE", "PROOF-REQUEST"],
  exposeHeaders: ["WWW-Authenticate", "PROOF-REQUEST", "PROOF-RESULT"]
}));

// Public Schema Endpoint
const schemaPath = path.resolve("./schemas/v1/agent-delegation-ticket.json");
let cachedSchema: string | null = null;
if (fs.existsSync(schemaPath)) {
  cachedSchema = fs.readFileSync(schemaPath, "utf-8");
}

app.get("/schemas/v1/agent-delegation-ticket.json", (c) => {
  if (!cachedSchema) {
    if (fs.existsSync(schemaPath)) {
      cachedSchema = fs.readFileSync(schemaPath, "utf-8");
    } else {
      return c.text("Schema not found", 404);
    }
  }
  return c.newResponse(cachedSchema, 200, {
    "Content-Type": "application/schema+json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=86400"
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "healthy", domain: "auth.x401.tech", port: 3006 });
});

// 1. Issue challenge nonce & x401 headers
app.get("/challenge", (c) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 300; // 5 min TTL

  stmtInsert.run(nonce, now, expiresAt);

  c.header(
    "WWW-Authenticate",
    `X401 realm="auth.x401.tech", challenge="${nonce}", spec="https://auth.x401.tech/schemas/v1/agent-delegation-ticket.json"`
  );
  c.header(
    "PROOF-REQUEST",
    Buffer.from(
      JSON.stringify({
        version: "1.0.0",
        required_claims: ["permissions.mcp_tools", "permissions.cross_server_transfer"],
        nonce
      })
    ).toString("base64")
  );

  return c.json({ error: "Unauthorized", challenge: nonce }, 401);
});

// 2. Cross-MCP Dispatch Gateway
app.post("/mcp/dispatch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const proofResponse = c.req.header("PROOF-RESPONSE");

  let rawToken: string | undefined;
  if (authHeader?.startsWith("X401 ")) {
    rawToken = authHeader.slice(5).trim();
  } else if (proofResponse) {
    rawToken = proofResponse.trim();
  }

  if (!rawToken) {
    return c.json(
      { error: "Missing x401 token", challenge_endpoint: "/challenge" },
      401,
      { "WWW-Authenticate": 'X401 realm="auth.x401.tech"' }
    );
  }

  let ticket: X401DelegationTicket;
  try {
    const rawJson = Buffer.from(
      rawToken.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    ticket = JSON.parse(rawJson);
  } catch {
    return c.json({ error: "Malformed delegation token payload" }, 400);
  }

  const payload = await c.req.json();
  const now = Math.floor(Date.now() / 1000);

  // Atomic Nonce Check & Burn: Prevents race condition replay
  const burnedRecord = stmtAtomicBurn.get(ticket.nonce, now) as { nonce: string } | undefined;
  if (!burnedRecord) {
    return c.json(
      { error: "Nonce expired, unknown, or replayed", code: "ERR_NONCE_REPLAY" },
      401
    );
  }

  try {
    await verifyX401Ticket(ticket, {
      expectedNonce: ticket.nonce,
      targetServer: payload.target_mcp,
      requestedAction: payload.action,
      spendAmount: payload.spend_amount,
      transferCheck: {
        fromServer: payload.source_mcp,
        toServer: payload.target_mcp,
        artifactType: payload.artifact_type
      }
    });
  } catch (err: unknown) {
    if (err instanceof X401VerificationError) {
      return c.json(
        { error: "Authorization failed", code: err.code, message: err.message },
        403
      );
    }
    return c.json({ error: "Internal verification error" }, 500);
  }

  // Downstream MCP RPC Forwarding with 10s Circuit-Breaker Timeout
  try {
    const downstreamResponse = await fetch(`${payload.target_mcp}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Principal-DID": ticket.issuer.did,
        "X-Agent-ID": ticket.subject_agent.agent_id,
        "X-Ticket-ID": ticket.ticket_id
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: payload.action,
        params: payload.parameters
      }),
      signal: AbortSignal.timeout(10000)
    });

    const responseBody = await downstreamResponse.text();
    return new Response(responseBody, {
      status: downstreamResponse.status,
      headers: {
        "Content-Type": downstreamResponse.headers.get("Content-Type") || "application/json",
        "PROOF-RESULT": Buffer.from(
          JSON.stringify({ status: "VERIFIED", ticket_id: ticket.ticket_id })
        ).toString("base64")
      }
    });
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return c.json({ error: "Upstream MCP timed out after 10s", code: "ERR_GATEWAY_TIMEOUT" }, 504);
    }
    return c.json({ error: "Failed to connect to upstream MCP", code: "ERR_BAD_GATEWAY" }, 502);
  }
});

const PORT = 3006;
console.log(`[x401-gateway] Listening on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });
