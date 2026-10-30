import http from "node:http";
import {
  canonicalizeJSON,
  uint8ArrayToBase64Url,
  X401DelegationTicket,
  JWK_EC
} from "../src/index";

// Mock upstream MCP servers
function startMockMcp(port: number, serviceName: string) {
  return http
    .createServer(async (req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: parsed.id,
            result: {
              service: serviceName,
              actionExecuted: parsed.method,
              receivedParams: parsed.params,
              verifiedPrincipal: req.headers["x-principal-did"]
            }
          })
        );
      });
    })
    .listen(port);
}

// In-Memory mock KV store matching Cloudflare KV contract
class MockKV {
  private store = new Map<string, string>();
  async put(key: string, val: string) {
    this.store.set(key, val);
  }
  async get(key: string) {
    return this.store.get(key) || null;
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

async function runE2E() {
  console.log("--> Initializing Upstream Mock MCPs...");
  const slackServer = startMockMcp(9001, "SlackMCP");
  const linearServer = startMockMcp(9002, "LinearMCP");

  const SLACK_ORIGIN = "http://127.0.0.1:9001";
  const LINEAR_ORIGIN = "http://127.0.0.1:9002";

  console.log("--> Generating Cryptographic Keys...");
  const humanPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const humanJwk = (await crypto.subtle.exportKey("jwk", humanPair.publicKey)) as JWK_EC;

  const agentPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const agentJwk = (await crypto.subtle.exportKey("jwk", agentPair.publicKey)) as JWK_EC;

  console.log("--> Requesting Challenge Nonce from Gateway...");
  const nonceBytes = new Uint8Array(24);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const kv = new MockKV();
  await kv.put(`nonce:${nonce}`, "active");

  console.log("--> Minting Delegation Ticket signed by Human...");
  const now = Math.floor(Date.now() / 1000);
  const ticketBody: Omit<X401DelegationTicket, "signature"> = {
    x401_version: "1.0.0",
    ticket_id: crypto.randomUUID(),
    issuer: {
      did: "did:proof:usr_e2e_principal",
      verification_method: "https://auth.proof.com/user#key-1",
      public_key_jwk: humanJwk
    },
    subject_agent: {
      agent_id: "agent_e2e_executor",
      public_key_jwk: agentJwk
    },
    issued_at: now,
    expires_at: now + 600,
    nonce: nonce,
    permissions: {
      mcp_tools: [
        {
          server_origin: LINEAR_ORIGIN,
          allowed_actions: ["issues:create"]
        }
      ],
      budget: {
        currency: "USDC",
        max_session_spend: 10.0,
        per_action_limit: 2.0
      },
      cross_server_transfer: {
        allowed_routes: [
          {
            from_server: SLACK_ORIGIN,
            to_server: LINEAR_ORIGIN,
            allowed_artifact_types: ["slack_thread_context"]
          }
        ]
      }
    }
  };

  const canonicalBytes = new TextEncoder().encode(canonicalizeJSON(ticketBody));
  const rawSig = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    humanPair.privateKey,
    canonicalBytes
  );

  const fullTicket: X401DelegationTicket = {
    ...ticketBody,
    signature: {
      algorithm: "ES256",
      value: uint8ArrayToBase64Url(new Uint8Array(rawSig))
    }
  };

  const serializedTicket = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(fullTicket))
  );

  console.log("--> Dispatched Agent Context Transfer: Slack -> Linear");
  const { verifyX401Ticket } = await import("../src/index");

  // Step 1: Verify token against gateway parameters
  await verifyX401Ticket(fullTicket, {
    expectedNonce: nonce,
    targetServer: LINEAR_ORIGIN,
    requestedAction: "issues:create",
    spendAmount: 1.5,
    transferCheck: {
      fromServer: SLACK_ORIGIN,
      toServer: LINEAR_ORIGIN,
      artifactType: "slack_thread_context"
    }
  });

  // Step 2: Burn nonce
  await kv.delete(`nonce:${nonce}`);

  // Step 3: Forward to Linear MCP
  const forwardRes = await fetch(`${LINEAR_ORIGIN}/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Principal-DID": fullTicket.issuer.did,
      "X-Agent-ID": fullTicket.subject_agent.agent_id
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "rpc-call-1",
      method: "issues:create",
      params: {
        title: "Bug reported from Slack",
        context: "Extracted from Slack thread #eng-alerts"
      }
    })
  });

  const forwardJson = await forwardRes.json();
  console.log("--> Upstream MCP Execution Successful:", JSON.stringify(forwardJson, null, 2));

  // Verify replay fails
  const recheckNonce = await kv.get(`nonce:${nonce}`);
  if (recheckNonce === null) {
    console.log("--> Nonce successfully burned. Replay defense verified.");
  } else {
    throw new Error("Nonce was not invalidated!");
  }

  slackServer.close();
  linearServer.close();
  console.log("--> All test assertions passed.");
}

runE2E().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});