import { Hono } from "hono";
import {
  verifyX401Ticket,
  X401DelegationTicket,
  X401VerificationError
} from "@x401/verifier";

interface Bindings {
  NONCE_KV: KVNamespace;
}

interface ForwardBridgePayload {
  source_mcp: string;
  target_mcp: string;
  action: string;
  artifact_type?: string;
  spend_amount?: number;
  parameters: Record<string, unknown>;
}

const app = new Hono<{ Bindings: Bindings }>();

// 1. Issue challenge nonce & x401 headers
app.get("/challenge", async (c) => {
  const nonceBytes = new Uint8Array(24);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await c.env.NONCE_KV.put(`nonce:${nonce}`, "active", { expirationTtl: 300 });

  c.header(
    "WWW-Authenticate",
    `X401 realm="mcp-gateway", challenge="${nonce}", spec="https://x401.tech/schemas/v1/agent-delegation-ticket.json"`
  );
  c.header(
    "PROOF-REQUEST",
    btoa(
      JSON.stringify({
        version: "1.0.0",
        required_claims: ["permissions.mcp_tools", "permissions.cross_server_transfer"],
        nonce
      })
    )
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
      { "WWW-Authenticate": 'X401 realm="mcp-gateway"' }
    );
  }

  let ticket: X401DelegationTicket;
  try {
    const rawJson = atob(rawToken.replace(/-/g, "+").replace(/_/g, "/"));
    ticket = JSON.parse(rawJson);
  } catch {
    return c.json({ error: "Malformed delegation token payload" }, 400);
  }

  const payload = await c.req.json<ForwardBridgePayload>();

  // Nonce Replay Defense
  const nonceKey = `nonce:${ticket.nonce}`;
  const storedNonce = await c.env.NONCE_KV.get(nonceKey);
  if (!storedNonce) {
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

    // Atomically burn nonce upon successful validation
    await c.env.NONCE_KV.delete(nonceKey);
  } catch (err: unknown) {
    if (err instanceof X401VerificationError) {
      return c.json(
        { error: "Authorization failed", code: err.code, message: err.message },
        403
      );
    }
    return c.json({ error: "Internal verification error" }, 500);
  }

  // Forward to target MCP upstream
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
    })
  });

  const responseBody = await downstreamResponse.text();
  return new Response(responseBody, {
    status: downstreamResponse.status,
    headers: {
      "Content-Type": downstreamResponse.headers.get("Content-Type") || "application/json",
      "PROOF-RESULT": btoa(
        JSON.stringify({ status: "VERIFIED", ticket_id: ticket.ticket_id })
      )
    }
  });
});

export default app;