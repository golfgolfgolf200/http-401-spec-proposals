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
import { isValidUpstreamMcp } from "./validate-url.ts";

const db = new DatabaseSync("/var/lib/x401-auth/nonces.db");
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
const stmtAtomicBurn = db.prepare(
  "DELETE FROM active_nonces WHERE nonce = ? AND expires_at >= ? RETURNING nonce"
);
const stmtPruneExpired = db.prepare(
  "DELETE FROM active_nonces WHERE expires_at < ?"
);

setInterval(() => {
  try {
    const now = Math.floor(Date.now() / 1000);
    stmtPruneExpired.run(now);
  } catch (err) {
    console.error("[aed-gateway] Error during nonce sweep:", err);
  }
}, 60000).unref();

interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, 300000).unref();

function rateLimiter(limit: number, windowSec: number) {
  return async (c: any, next: () => Promise<void>) => {
    const clientIp =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const now = Date.now();
    const windowMs = windowSec * 1000;
    const bucket = rateLimitStore.get(clientIp);

    if (!bucket || now > bucket.resetAt) {
      rateLimitStore.set(clientIp, { count: 1, resetAt: now + windowMs });
      c.header("RateLimit-Limit", String(limit));
      c.header("RateLimit-Remaining", String(limit - 1));
      c.header("RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
      await next();
      return;
    }

    if (bucket.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfter));
      c.header("RateLimit-Limit", String(limit));
      c.header("RateLimit-Remaining", "0");
      c.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
      return c.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please retry after specified time."
        },
        429
      );
    }

    bucket.count += 1;
    c.header("RateLimit-Limit", String(limit));
    c.header("RateLimit-Remaining", String(limit - bucket.count));
    c.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    await next();
  };
}

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "PROOF-RESPONSE", "PROOF-REQUEST"],
  exposeHeaders: ["WWW-Authenticate", "PROOF-REQUEST", "PROOF-RESULT", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"]
}));

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

app.get("/health", (c) => {
  return c.json({ status: "healthy", domain: "auth.x401.tech", port: 3006 });
});

app.get("/challenge", rateLimiter(45, 60), (c) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 300;

  stmtInsert.run(nonce, now, expiresAt);

  c.header(
    "WWW-Authenticate",
    `AED realm="auth.x401.tech", challenge="${nonce}", spec="https://401frameworks.org/schemas/v1/agent-delegation-ticket.json"`
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

app.post("/mcp/dispatch", rateLimiter(60, 60), async (c) => {
  const MAX_BYTES = 1024 * 1024; // 1 MB
  const contentLength = Number(c.req.header("content-length") || "0");
  if (contentLength > MAX_BYTES) {
    return c.json({ error: "Payload Too Large", code: "ERR_PAYLOAD_TOO_LARGE" }, 413);
  }


  const authHeader = c.req.header("Authorization");
  const proofResponse = c.req.header("PROOF-RESPONSE");

  let rawToken: string | undefined;
  if (authHeader?.startsWith("AED ")) {
    rawToken = authHeader.slice(4).trim();
  } else if (authHeader?.startsWith("X401 ")) {
    rawToken = authHeader.slice(5).trim();
  } else if (authHeader?.startsWith("Bearer ")) {
    rawToken = authHeader.slice(7).trim();
  } else if (proofResponse) {
    rawToken = proofResponse.trim();
  }

  if (!rawToken) {
    return c.json(
      { error: "Missing delegation token", challenge_endpoint: "/challenge" },
      401,
      { "WWW-Authenticate": "AED realm=\"auth.x401.tech\"" }
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

  let payload: any;
  try {
    const rawBody = await c.req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BYTES) {
      return c.json({ error: "Payload Too Large", code: "ERR_PAYLOAD_TOO_LARGE" }, 413);
    }
    payload = JSON.parse(rawBody);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Too Large")) {
      return c.json({ error: "Payload Too Large", code: "ERR_PAYLOAD_TOO_LARGE" }, 413);
    }
    return c.json({ error: "Invalid JSON body", code: "ERR_INVALID_BODY" }, 400);
  }
  const now = Math.floor(Date.now() / 1000);

  const burnedRecord = stmtAtomicBurn.get(ticket.nonce, now) as { nonce: string } | undefined;
  if (!burnedRecord) {
    return c.json(
      { error: "Nonce expired, unknown, or replayed", code: "ERR_NONCE_REPLAY" },
      401
    );
  }

  if (!(await isValidUpstreamMcp(payload.target_mcp))) {
    return c.json(
      { error: "Invalid or restricted upstream MCP target URL", code: "ERR_RESTRICTED_UPSTREAM" },
      400
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
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return c.json({ error: "Upstream MCP timed out after 10s", code: "ERR_GATEWAY_TIMEOUT" }, 504);
    }
    return c.json({ error: "Failed to connect to upstream MCP", code: "ERR_BAD_GATEWAY" }, 502);
  }
});

const PORT = 3006;
console.log(`[aed-gateway] Listening on http://127.0.0.1:${PORT}`);
serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" });
