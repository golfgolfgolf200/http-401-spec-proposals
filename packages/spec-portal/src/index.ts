import { Hono } from "hono";
import { cors } from "hono/cors";
import schemaJson from "./assets/agent-delegation-ticket.json";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type"]
}));

// 1. Canonical Schema Endpoint
app.get("/schemas/v1/agent-delegation-ticket.json", (c) => {
  return c.newResponse(JSON.stringify(schemaJson, null, 2), 200, {
    "Content-Type": "application/schema+json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
  });
});

// 2. Main Portal Homepage
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AED Framework | Agent Execution & Delegation Standard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #e2e8f0; margin: 0; padding: 48px 24px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; }
    .hero { text-align: center; margin-bottom: 32px; }
    h1 { color: #38bdf8; font-size: 2.6rem; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
    .author-tag { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.4rem; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-family: monospace; }
    .desc { font-size: 1.15rem; color: #cbd5e1; margin: 20px auto; max-width: 820px; text-align: left; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 26px; margin-top: 24px; }
    .card h3 { margin-top: 0; color: #f8fafc; font-size: 1.3rem; }
    ul { padding-left: 20px; margin-bottom: 0; }
    li { margin-bottom: 10px; }
    a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>AED (Agent Execution & Delegation) Framework</h1>
      <div class="author-tag">An open standard authored by <strong>Josh Hart</strong> &bull; <span class="badge">RFC-401-02</span></div>
    </div>
    
    <p class="desc">A zero-trust cryptographic authorization and boundary control standard for autonomous Model Context Protocol (MCP) agents. Built natively on the standard <code>HTTP 401 Unauthorized</code> challenge-response mechanism, AED intercepts unauthenticated actions with cryptographic challenge nonces—enforcing human-signed per-action budgets, tool allowlists, and cross-server confinement without centralized state.</p>
    
    <div class="card">
      <h3>Specification & Engineering Resources</h3>
      <ul>
        <li><a href="/architecture">Zero-Trust Protocol Boundary & Settlement Architecture (RFC-x401-02)</a></li>
        <li><a href="/rfc/x401-01">Read Baseline Specification: RFC-401-01 (v1.0.0)</a></li>
        <li><a href="/schemas/v1/agent-delegation-ticket.json">Canonical JSON Schema (Draft 2020-12)</a></li>
        <li><a href="/debugger">Interactive Delegation Ticket Debugger & Inspector</a></li>
      </ul>
    </div>
  </div>
</body>
</html>`);
});

// 3. Secondary Architecture & Security Specification Page
app.get("/architecture", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AED Zero-Trust Architecture & Security Invariants</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #e2e8f0; margin: 0; padding: 48px 24px; line-height: 1.6; }
    .container { max-width: 880px; margin: 0 auto; }
    h1 { color: #38bdf8; font-size: 2.2rem; margin-bottom: 0.4rem; }
    h2 { color: #7dd3fc; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-top: 36px; font-size: 1.45rem; }
    h3 { color: #38bdf8; margin-top: 24px; font-size: 1.15rem; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin: 20px 0; }
    pre { background: #0b1120; border: 1px solid #1e293b; padding: 18px; border-radius: 8px; overflow-x: auto; color: #f1f5f9; font-family: monospace; font-size: 0.88rem; line-height: 1.45; }
    ul { padding-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 8px; }
    a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .formula { font-family: monospace; background: #1e293b; padding: 8px 14px; border-radius: 6px; display: inline-block; color: #f8fafc; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Portal</a></p>
    <h1>Agent Execution Delegation (AED) Protocol</h1>
    <p>This schema establishes a zero-trust, boundary-enforced delegation and gasless settlement contract for autonomous AI agents. Rather than relying on agent alignment, natural language boundaries, or custom escrow smart contracts, it enforces mathematical and cryptographic constraints directly at the network edge before external tools execute and before payments settle.</p>

    <h2>1. Architectural Role & Protocol Boundary</h2>
    <p>The schema operates as a verifiable ticket presented by an agent to an intermediary verifying gateway (mediating access to Model Context Protocol / x402 endpoints).</p>

    <pre>
[Human Principal / Treasury] 
       │ (Signs EIP-3009 transfer & AED ticket with RFC 8785 signature)
       ▼
[Autonomous Agent] 
       │ (Transports pre-signed ticket; holds zero treasury private keys)
       ▼
[Verifying Gateway Edge] 
       ├── 1. Verifies ticket signature & audience URI
       ├── 2. Checks single-use challenge nonce & lifespan TTL
       ├── 3. Enforces call_commitment (SHA-256 over canonical RPC args)
       ├── 4. Evaluates declarative parameter_rules (JSONPath assertions)
       ├── 5. Dispatches request to target MCP server
       ├── 6. Intercepts response & validates against expected_output_schema
       ├── 7. Verifies proof_of_deliverable server attestation
       └── 8. Executes settlement:
              ├── Relays Circle EIP-3009 receiveWithAuthorization on-chain, OR
              └── Releases Macaroon HMAC discharge caveat token
    </pre>

    <h2>2. Core Security Pillars</h2>

    <h3>A. Zero-Trust Parameter Confinement</h3>
    <ul>
      <li><code>parameter_constraints.call_commitment</code>: Enforces a strict SHA-256 hash over the canonical JSON byte sequence (RFC 8785) of the tool parameters. If prompt injection or model hallucination causes the agent to alter arguments, the hash check fails immediately.</li>
      <li><code>canonicalization_target</code>: Disambiguates JSON-RPC wire targets (<code>mcp_tool_arguments</code> for <code>params.arguments</code> vs <code>jsonrpc_raw_params</code> for raw <code>params</code>).</li>
      <li><code>parameter_rules</code>: Allows fine-grained assertions over arguments via JSONPath (e.g., locking transfer recipients, setting threshold limits).</li>
      <li><code>disallow_batch_rpc: true</code>: Closes JSON-RPC batching vulnerabilities, preventing agents from multiplexing unauthorized calls under a single authorization.</li>
    </ul>

    <h3>B. Enforceable Deliverable Contracts</h3>
    <ul>
      <li><code>output_contract.expected_output_schema</code>: Upstream tool responses are intercepted and validated against an embedded JSON Schema before settlement can occur.</li>
      <li><code>strict_mode: true</code>: Automatically forces <code>additionalProperties: false</code> on response objects, blocking payload injection or unexpected side-channel outputs.</li>
      <li><code>proof_of_deliverable</code>: Requires the server to sign a composite digest:
        <br />
        <div class="formula">digest = SHA-256(ticket_id ∥ nonce ∥ action ∥ JCS(output_body))</div>
        <br />
        This prevents the tool provider from replaying previous responses or billing for failed/unexecuted tasks.
      </li>
    </ul>

    <h3>C. Smart-Contract-Free, Front-Running-Immune Settlement</h3>
    <ul>
      <li><strong>Circle USDC Native Rail (<code>circle_usdc_eip3009</code>):</strong>
        <ul>
          <li>Leverages Circle’s canonical token contract method <code>receiveWithAuthorization</code>.</li>
          <li><strong>Front-Running Immunity:</strong> Because the contract enforces <code>require(msg.sender == to)</code>, the recipient is bound to the gateway relayer address. Public mempool bots and MEV searchers cannot intercept and claim the authorization signature prematurely.</li>
          <li><strong>Zero Custody Risk for Agents:</strong> The human principal signs the transfer off-chain. The agent merely carries the ticket; it never holds the wallet private keys.</li>
        </ul>
      </li>
      <li><strong>Macaroon Caveat Rail (<code>macaroon_caveat_chain</code>):</strong>
        <ul>
          <li>Enables decentralized, off-chain capability delegation via HMAC-SHA256 caveat chains.</li>
          <li>The gateway serves as the third-party arbitrator, minting the discharge token only when the deliverable schema and attestation pass.</li>
        </ul>
      </li>
    </ul>

    <h3>D. Strict Network Domain & Currency Coupling</h3>
    <ul>
      <li><strong>Root <code>oneOf</code> Invariant:</strong>
        <ul>
          <li>Disallows cross-chain signature replay and network confusion attacks.</li>
          <li>Setting <code>chain_id: 8453</code> (Base) strictly mandates <code>network: "base"</code> and <code>currency: "USDC"</code>. A Base signature cannot be broadcast on Arbitrum, Ethereum Mainnet, or Polygon.</li>
        </ul>
      </li>
    </ul>

    <h3>E. Deterministic, Fail-Closed Error States</h3>
    <ul>
      <li><code>error_handling.supported_error_codes</code>: Standardizes error handling across gateways, agents, and servers (<code>ERR_CALL_COMMITMENT_MISMATCH</code>, <code>ERR_DELIVERABLE_SCHEMA_MISMATCH</code>, <code>ERR_USDC_AUTHORIZATION_EXPIRED</code>, etc.).</li>
      <li>If an execution fails at any step, the gateway drops the EIP-3009 authorization without broadcasting it on-chain, and the funds remain untouched in the payer's wallet.</li>
    </ul>
  </div>
</body>
</html>`);
});

// 4. RFC Specification Rendered Page
app.get("/rfc/x401-01", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RFC-401-01: Agent Action Delegation & Boundary Control Protocol</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #e2e8f0; margin: 0; padding: 48px 24px; line-height: 1.6; }
    .container { max-width: 860px; margin: 0 auto; }
    h1 { color: #38bdf8; font-size: 2.1rem; }
    h2 { color: #7dd3fc; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-top: 36px; }
    .meta-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 0.95rem; }
    pre { background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; color: #e2e8f0; font-family: monospace; font-size: 0.9rem; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Home</a></p>
    <h1>RFC-401-01: Agent Action Delegation Protocol</h1>
    <div class="meta-box">
      <div><strong>Author:</strong> Josh Hart</div>
      <div><strong>Contact:</strong> <code>contact@401frameworks.org</code></div>
      <div><strong>Status:</strong> Proposed Standard</div>
      <div><strong>Category:</strong> Standards Track / HTTP Extension</div>
      <div><strong>Prior Art:</strong> <a href="https://x401.proof.com/" target="_blank" rel="noreferrer">Proof x401 HTTP Proof Requirement Protocol</a></div>
      <div><strong>Canonical Schema:</strong> <code>https://401frameworks.org/schemas/v1/agent-delegation-ticket.json</code></div>
    </div>

    <h2>1. Abstract</h2>
    <p>The AED (Agent Execution & Delegation) Framework standardizes zero-trust delegation over HTTP 401 challenges. While baseline specifications focus on presenting verified legal credentials via OpenID4VP, this extension standardizes the <strong>Delegation Ticket</strong> contract. It provides programmatic constraints for tool allowlists, per-action spend limits, and cross-MCP transfer boundaries using P-256 ECDSA and RFC 8785 JSON Canonicalization.</p>

    <h2>2. HTTP Wire Mechanics</h2>
    <pre>
Client (Agent)                Edge Gateway (AED Framework)               Target MCP Server
|                                     |                                   |
| ---- 1. GET/POST /mcp/dispatch ---> |                                   |
| &lt;--- 2. HTTP 401 Unauthorized ----- |                                   |
|      WWW-Authenticate: AED ...      |                                   |
|      PROOF-REQUEST: &lt;...&gt;           |                                   |
|                                     |                                   |
| [Agent invokes Human Signer]        |                                   |
| ---- 3. POST /mcp/dispatch -------&gt; |                                   |
|      Authorization: AED &lt;ticket&gt;    |                                   |
|                                     | -- 4. Verify &amp; Invalidate Nonce - |
|                                     | ---- 5. Forward RPC Call -------&gt; |
|                                     | &lt;--- 6. RPC Result -------------- |
| &lt;--- 7. HTTP 200 OK --------------- |                                   |
|      PROOF-RESULT: &lt;...&gt;            |                                   |
    </pre>

    <h2>3. Cryptographic Invariants</h2>
    <ul>
      <li><strong>Canonicalization:</strong> Payloads are serialized using RFC 8785 (JSON Canonicalization Scheme).</li>
      <li><strong>Signature:</strong> Signed with ECDSA over NIST P-256 (ES256) with SHA-256.</li>
      <li><strong>Replay Defense:</strong> Single-use challenge nonces with 300-second TTL atomically burned on execution.</li>
      <li><strong>Boundary Control:</strong> Strict validation of cross-MCP transfer routes prior to payload dispatch.</li>
    </ul>
  </div>
</body>
</html>`);
});

// 5. Interactive Ticket Debugger
app.get("/debugger", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AED Ticket Inspector & Debugger</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #e2e8f0; margin: 0; padding: 48px 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #38bdf8; margin-bottom: 0.2rem; }
    .subtitle { color: #94a3b8; margin-bottom: 24px; }
    textarea { width: 100%; height: 110px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; padding: 12px; font-family: monospace; font-size: 0.9rem; box-sizing: border-box; outline: none; }
    textarea:focus { border-color: #38bdf8; }
    pre { background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; color: #38bdf8; min-height: 220px; font-size: 0.9rem; }
    .status { padding: 10px 16px; border-radius: 8px; margin-top: 12px; font-weight: 600; font-size: 0.95rem; }
    .status.valid { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .status.invalid { background: #7f1d1d; color: #f87171; border: 1px solid #b91c1c; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Home</a></p>
    <h1>AED Ticket Debugger</h1>
    <div class="subtitle">Decode, inspect, and validate AED agent delegation tokens in real-time.</div>
    <textarea id="tokenInput" placeholder="Paste Authorization: AED <token>, X401 <token>, or raw Base64URL string here..."></textarea>
    <div id="statusBox" class="status invalid" style="display:none;"></div>
    <h3>Decoded Claims & Constraints</h3>
    <pre id="jsonOutput">// Decoded ticket JSON will appear here...</pre>
  </div>
  <script>
    const input = document.getElementById("tokenInput");
    const output = document.getElementById("jsonOutput");
    const statusBox = document.getElementById("statusBox");

    function parseToken(raw) {
      try {
        let clean = raw.trim();
        if (clean.startsWith("Authorization: AED ")) clean = clean.slice(19).trim();
        if (clean.startsWith("Authorization: X401 ")) clean = clean.slice(20).trim();
        if (clean.startsWith("PROOF-RESPONSE: ")) clean = clean.slice(16).trim();
        if (clean.startsWith("AED ")) clean = clean.slice(4).trim();
        if (clean.startsWith("X401 ")) clean = clean.slice(5).trim();
        if (!clean) {
          output.textContent = "// Awaiting input...";
          statusBox.style.display = "none";
          return;
        }
        const b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(b64);
        const parsed = JSON.parse(json);
        output.textContent = JSON.stringify(parsed, null, 2);
        statusBox.style.display = "block";
        statusBox.className = "status valid";
        statusBox.textContent = "Valid Ticket Format (Issuer DID: " + (parsed.issuer?.did || parsed.principal?.subject_id || "Unknown") + ")";
      } catch (e) {
        output.textContent = "// Parse Error: " + e.message;
        statusBox.style.display = "block";
        statusBox.className = "status invalid";
        statusBox.textContent = "Invalid Base64URL encoding or corrupted JSON";
      }
    }
    input.addEventListener("input", (e) => parseToken(e.target.value));
  </script>
</body>
</html>`);
});

export default app;