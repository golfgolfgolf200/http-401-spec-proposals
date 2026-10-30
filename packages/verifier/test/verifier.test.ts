import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyX401Ticket,
  canonicalizeJSON,
  uint8ArrayToBase64Url,
  X401DelegationTicket,
  JWK_EC
} from "../src/index.js";

async function generateTestKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const jwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JWK_EC;
  return { privateKey: keyPair.privateKey, publicKeyJwk: jwk };
}

async function signTicketBody(
  body: Omit<X401DelegationTicket, "signature">,
  privateKey: CryptoKey
): Promise<string> {
  const canonicalBytes = new TextEncoder().encode(canonicalizeJSON(body));
  const rawSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    canonicalBytes
  );
  return uint8ArrayToBase64Url(new Uint8Array(rawSignature));
}

test("x401 Verifier Suite", async (t) => {
  const issuerKeys = await generateTestKeypair();
  const agentKeys = await generateTestKeypair();
  const now = 1793232000;

  const validBasePayload: Omit<X401DelegationTicket, "signature"> = {
    x401_version: "1.0.0",
    ticket_id: "7d0d0fca-b605-4c07-b3b3-21c62f2c8d23",
    issuer: {
      did: "did:proof:usr_valid_01",
      verification_method: "https://auth.proof.com/keys/1",
      public_key_jwk: issuerKeys.publicKeyJwk
    },
    subject_agent: {
      agent_id: "agent_runner_alpha",
      public_key_jwk: agentKeys.publicKeyJwk
    },
    issued_at: now,
    expires_at: now + 3600,
    nonce: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    permissions: {
      mcp_tools: [
        {
          server_origin: "https://slack.internal.mcp",
          allowed_actions: ["channels:read", "messages:post"],
          denied_actions: ["channels:delete"]
        },
        {
          server_origin: "https://linear.internal.mcp",
          allowed_actions: ["issues:create", "issues:read"]
        }
      ],
      budget: {
        currency: "USDC",
        network: "base",
        max_session_spend: 50.0,
        per_action_limit: 10.0
      },
      cross_server_transfer: {
        allowed_routes: [
          {
            from_server: "https://slack.internal.mcp",
            to_server: "https://linear.internal.mcp",
            allowed_artifact_types: ["issue_summary", "bug_report"]
          }
        ]
      }
    }
  };

  await t.test("accepts valid delegation ticket and options", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const ticket: X401DelegationTicket = {
      ...validBasePayload,
      signature: { algorithm: "ES256", value: signature }
    };

    const res = await verifyX401Ticket(ticket, {
      currentTimestamp: now + 30,
      expectedNonce: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
      targetServer: "https://slack.internal.mcp",
      requestedAction: "messages:post",
      spendAmount: 5.0
    });

    assert.equal(res.valid, true);
    assert.equal(res.principalId, "did:proof:usr_valid_01");
    assert.equal(res.agentId, "agent_runner_alpha");
  });

  await t.test("rejects tampered canonical payload", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const tamperedPayload = JSON.parse(JSON.stringify(validBasePayload));
    tamperedPayload.permissions.budget.max_session_spend = 999999.0; // Tampering budget

    const ticket: X401DelegationTicket = {
      ...tamperedPayload,
      signature: { algorithm: "ES256", value: signature }
    };

    await assert.rejects(
      async () => verifyX401Ticket(ticket, { currentTimestamp: now + 30 }),
      { code: "ERR_SIG_INVALID" }
    );
  });

  await t.test("rejects expired ticket and future clock skew", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const ticket: X401DelegationTicket = {
      ...validBasePayload,
      signature: { algorithm: "ES256", value: signature }
    };

    // Past expiration
    await assert.rejects(
      async () => verifyX401Ticket(ticket, { currentTimestamp: now + 4000 }),
      { code: "ERR_EXPIRED" }
    );

    // Clock skew: current time prior to issued_at - 60s
    await assert.rejects(
      async () => verifyX401Ticket(ticket, { currentTimestamp: now - 120 }),
      { code: "ERR_NOT_YET_VALID" }
    );
  });

  await t.test("enforces budget caps", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const ticket: X401DelegationTicket = {
      ...validBasePayload,
      signature: { algorithm: "ES256", value: signature }
    };

    await assert.rejects(
      async () =>
        verifyX401Ticket(ticket, {
          currentTimestamp: now + 10,
          spendAmount: 15.0 // Exceeds per_action_limit of 10.0
        }),
      { code: "ERR_PER_ACTION_BUDGET_EXCEEDED" }
    );
  });

  await t.test("enforces explicit action denylist and authorization whitelist", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const ticket: X401DelegationTicket = {
      ...validBasePayload,
      signature: { algorithm: "ES256", value: signature }
    };

    // Denied action
    await assert.rejects(
      async () =>
        verifyX401Ticket(ticket, {
          currentTimestamp: now + 10,
          targetServer: "https://slack.internal.mcp",
          requestedAction: "channels:delete"
        }),
      { code: "ERR_ACTION_DENIED" }
    );

    // Unauthorized action
    await assert.rejects(
      async () =>
        verifyX401Ticket(ticket, {
          currentTimestamp: now + 10,
          targetServer: "https://slack.internal.mcp",
          requestedAction: "admin:kick"
        }),
      { code: "ERR_ACTION_UNAUTHORIZED" }
    );
  });

  await t.test("rejects cross-MCP boundary transfer violations", async () => {
    const signature = await signTicketBody(validBasePayload, issuerKeys.privateKey);
    const ticket: X401DelegationTicket = {
      ...validBasePayload,
      signature: { algorithm: "ES256", value: signature }
    };

    // Unauthorized target endpoint
    await assert.rejects(
      async () =>
        verifyX401Ticket(ticket, {
          currentTimestamp: now + 10,
          transferCheck: {
            fromServer: "https://slack.internal.mcp",
            toServer: "https://unauthorized-database.internal.mcp"
          }
        }),
      { code: "ERR_CROSS_MCP_VIOLATION" }
    );

    // Unauthorized artifact type
    await assert.rejects(
      async () =>
        verifyX401Ticket(ticket, {
          currentTimestamp: now + 10,
          transferCheck: {
            fromServer: "https://slack.internal.mcp",
            toServer: "https://linear.internal.mcp",
            artifactType: "raw_database_credentials"
          }
        }),
      { code: "ERR_CROSS_MCP_VIOLATION" }
    );
  });
});