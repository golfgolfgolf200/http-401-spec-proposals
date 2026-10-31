import { Hono } from "hono";
import { cors } from "hono/cors";
import schemaV1 from "./assets/agent-delegation-ticket.json";
import schemaV2 from "./assets/agent-delegation-ticket-v2.json";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type"]
}));

// --- Schema Endpoints ---
app.get("/schemas/v1/agent-delegation-ticket.json", (c) => {
  return c.newResponse(JSON.stringify(schemaV1, null, 2), 200, {
    "Content-Type": "application/schema+json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
  });
});

app.get("/schemas/v2/agent-delegation-ticket.json", (c) => {
  return c.newResponse(JSON.stringify(schemaV2, null, 2), 200, {
    "Content-Type": "application/schema+json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
  });
});

// Shared Head & CSS Stylesheet mirroring x401.tech
const headStyles = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #e2e8f0; margin: 0; padding: 48px 24px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; }
    .hero { text-align: center; margin-bottom: 32px; }
    h1 { color: #38bdf8; font-size: 2.6rem; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
    h2 { color: #7dd3fc; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-top: 36px; font-size: 1.45rem; }
    h3 { margin-top: 0; color: #f8fafc; font-size: 1.3rem; }
    h4 { margin-top: 0; margin-bottom: 8px; color: #7dd3fc; font-size: 1.05rem; }
    .author-tag { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.4rem; text-align: center; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-family: monospace; }
    .desc { font-size: 1.15rem; color: #cbd5e1; margin: 20px auto; max-width: 820px; text-align: left; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 26px; margin-top: 24px; }
    ul { padding-left: 20px; margin-bottom: 0; }
    li { margin-bottom: 10px; }
    a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    code { background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
    pre { background: #0b1120; border: 1px solid #1e293b; padding: 18px; border-radius: 8px; overflow-x: auto; color: #f1f5f9; font-family: monospace; font-size: 0.88rem; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 0.92rem; }
    th, td { border: 1px solid #1e293b; padding: 12px; text-align: left; vertical-align: top; }
    th { background: #162036; color: #38bdf8; }
    tr:nth-child(even) { background: #0b1120; }
    .tag-server { color: #34d399; font-weight: 600; font-size: 0.82rem; background: #064e3b; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .tag-agent { color: #f472b6; font-weight: 600; font-size: 0.82rem; background: #831843; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .tag-dual { color: #fbbf24; font-weight: 600; font-size: 0.82rem; background: #78350f; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .subcard { background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; }
    .formula { font-family: monospace; background: #1e293b; padding: 8px 14px; border-radius: 6px; display: inline-block; color: #f8fafc; margin: 8px 0; }
  </style>
`;

// --- 1. Homepage ---
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  ${headStyles}
  <title>x401 Protocol | Verifiable Agent Delegation & Zero-Contract Settlement</title>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>x401 Protocol</h1>
      <div class="author-tag">An open standard authored by <strong>Josh Hart</strong> &bull; <span class="badge">RFC-x401-02</span></div>
    </div>
    
    <p class="desc">A zero-trust cryptographic authorization and boundary control standard for autonomous Model Context Protocol (MCP) agents, enforcing human-signed per-action budgets, tool allowlists, deterministic parameter commitments, deliverable output verification, and smart-contract-free settlement without centralized state.</p>
    
    <div class="card">
      <h3>Specification & Engineering Resources</h3>
      <ul>
        <li><a href="/architecture">Zero-Trust Boundary & Settlement Architecture (RFC-x401-02)</a></li>
        <li><a href="/rfc/x401-02">Read Formal Specification: RFC-x401-02 (v2.0.0)</a></li>
        <li><a href="/rfc/x401-01">Read Prior Proposed Specification: RFC-x401-01 (v1.0.0)</a></li>
        <li><a href="/schemas/v2/agent-delegation-ticket.json">Canonical JSON Schema v2.0.0 (Draft 2020-12)</a></li>
        <li><a href="/schemas/v1/agent-delegation-ticket.json">Canonical JSON Schema v1.0.0 (Legacy)</a></li>
        <li><a href="/debugger">Interactive Delegation Ticket Debugger & Inspector</a></li>
        <li>GitHub Repository: <a href="https://github.com/golfgolfgolf200/http-401-spec-proposals" target="_blank" rel="noreferrer">github.com/golfgolfgolf200/http-401-spec-proposals</a></li>
      </ul>
    </div>

    <div class="card">
      <h3>Ecosystem Context: Proof x401 vs. RFC-x401-02</h3>
      <p>The <code>x401</code> protocol was pioneered by <a href="https://x401.proof.com/" target="_blank" rel="noreferrer">Proof</a> to establish human legal identity behind AI agents via OpenID4VP and Digital Credentials. <strong>RFC-x401-02 (AED: Agent Execution & Delegation)</strong> formalizes the operational execution and settlement layer—transforming the <code>HTTP 401</code> identity handshake into an enforceable zero-trust permission envelope for Model Context Protocol (MCP) servers, upstream tools, and autonomous agent swarms.</p>
      
      <table>
        <thead>
          <tr>
            <th>Protocol Vector</th>
            <th>Proof Baseline (x401.proof.com)</th>
            <th>RFC-x401-02 (AED Protocol)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Core Focus</strong></td>
            <td>Human KYC, Legal Entity Verification, and Agent Intent</td>
            <td>Input Commitments, Deliverable Contracts, Gasless Settlement, and Execution Boundaries</td>
          </tr>
          <tr>
            <td><strong>Identity & Keys</strong></td>
            <td>OpenID4VP, W3C Verifiable Credentials (IAL2)</td>
            <td>DIDs, P-256, secp256k1, and Ed25519 (OKP) JWK Attestations</td>
          </tr>
          <tr>
            <td><strong>Wire Protocol</strong></td>
            <td>HTTP 401 Challenge with URI match</td>
            <td>HTTP 401 Challenge with single-use nonces, audience origin binding, and <code>WWW-Authenticate: AED</code></td>
          </tr>
          <tr>
            <td><strong>Canonicalization</strong></td>
            <td>JWS / JWT compact serialization</td>
            <td>Strict RFC 8785 JSON Canonicalization Scheme (JCS)</td>
          </tr>
          <tr>
            <td><strong>Input Safeguards</strong></td>
            <td>Route-level challenge (URI match)</td>
            <td>Deterministic SHA-256 <code>call_commitment</code> & declarative JSONPath parameter assertions</td>
          </tr>
          <tr>
            <td><strong>Settlement Rail</strong></td>
            <td>None (Out of scope)</td>
            <td>Gasless Circle USDC EIP-3009 <code>receiveWithAuthorization</code> or HMAC Macaroon caveat chains</td>
          </tr>
          <tr>
            <td><strong>Anti-Replay Defense</strong></td>
            <td>Verifier nonce governed by wallet session lifecycles</td>
            <td>Audience isolation, single-use gateway nonces, and <code>max_ttl_seconds</code> ceilings</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>Architecture Upgrades Enabled by RFC-x401-02</h3>
      <p>Conforming servers, gateways, and autonomous agents implementing RFC-x401-02 benefit from eight foundational architectural capabilities:</p>
      
      <div class="grid">
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Deterministic Input Commitments</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Enforces an immutable SHA-256 digest over RFC 8785 canonical tool arguments. Even under prompt injection, altered arguments cause the gateway to immediately abort before tool execution.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-dual">SETTLEMENT</span> Gasless Circle USDC (EIP-3009)</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Settles transactions off-chain without custom smart contracts. Uses <code>receiveWithAuthorization</code> with relayer binding to ensure MEV bots and public mempools cannot front-run funds.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Deliverable Output Contracts</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Validates tool responses against embedded JSON Schemas with <code>strict_mode: true</code> and byte ceilings before funds move, preventing poisoned or hallucinated payloads from being paid.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-dual">SETTLEMENT</span> Macaroon Caveat Chains</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Supports decentralized capability delegation through HMAC-SHA256 caveat attenuation and gateway discharge arbitration without blockchain latency or transaction fees.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-agent">SECURITY</span> Audience & Replay Isolation</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Binds tickets to specific gateway origins via <code>audience</code> URIs and single-use challenge nonces with strict <code>max_ttl_seconds</code> expiration ceilings, eliminating replay risks.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-dual">STANDARDS</span> RPC Multiplexing Defense</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Mandates <code>disallow_batch_rpc: true</code> to prevent attackers from sneaking secondary unapproved tool invocations inside JSON-RPC 2.0 batch arrays.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-agent">AGENT</span> Ed25519 & Edwards Curve JWKs</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Provides high-performance signing via <code>Ed25519</code> OKP keys alongside NIST P-256 and secp256k1 curves, with strict JSON Schema coordinate validation.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Fail-Closed Typed Error Codes</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Standardizes machine-readable error codes (e.g., <code>ERR_CALL_COMMITMENT_MISMATCH</code>, <code>ERR_DELIVERABLE_SCHEMA_MISMATCH</code>) to ensure consistent fail-closed edge behavior.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

// --- 2. Architecture & Security Specification Page ---
app.get("/architecture", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  ${headStyles}
  <title>AED Zero-Trust Architecture & Security Invariants</title>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Portal</a></p>
    <h1>Agent Execution Delegation (AED) Protocol</h1>
    <div class="author-tag">Zero-Trust Protocol Boundary & Settlement Architecture &bull; <span class="badge">RFC-x401-02</span></div>
    
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

    <p style="margin-top: 32px;"><a href="/rfc/x401-02">Read Full RFC-x401-02 Technical Specification &rarr;</a></p>
  </div>
</body>
</html>`);
});

// --- 3. RFC-x401-02 Specification Page ---
app.get("/rfc/x401-02", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  ${headStyles}
  <title>RFC-x401-02: Verifiable Agent Action Delegation & Zero-Contract Settlement Protocol</title>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Portal</a></p>
    <h1>RFC-x401-02: Verifiable Agent Action Delegation & Zero-Contract Settlement Protocol</h1>
    <div class="card" style="margin-top: 10px;">
      <div><strong>Status:</strong> Proposed Standard</div>
      <div><strong>Category:</strong> Standards Track / HTTP & MCP Extension</div>
      <div><strong>Version:</strong> 2.0.0 (Obsoletes RFC-x401-01)</div>
      <div><strong>Canonical Schema:</strong> <a href="/schemas/v2/agent-delegation-ticket.json">https://401frameworks.org/schemas/v2/agent-delegation-ticket.json</a></div>
    </div>

    <h2>1. Abstract</h2>
    <p>The x401 Protocol defines a verifiable delegation ticket and its enforcement and settlement rules for agent-authorized actions over HTTP and Model Context Protocol (MCP) interfaces, including x402-style services.</p>
    <p>The proposal's design goal is to make zero assumptions about any particular agent design or any particular x402/MCP service implementation. It specifies only the interoperable ticket fields and the behavior required at the protocol boundary.</p>

    <h2>2. Evolution from v1 to v2</h2>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>RFC-x401-01 (v1.0.0)</th>
          <th>RFC-x401-02 (v2.0.0)</th>
          <th>Rationale</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Audience Binding</strong></td>
          <td>Not defined; cross-gateway replay possible.</td>
          <td>Mandatory audience URI.</td>
          <td>Restricts ticket to its intended gateway.</td>
        </tr>
        <tr>
          <td><strong>Input Enforcement</strong></td>
          <td>Coarse tool-name allowlists (<code>allowed_actions</code>).</td>
          <td>Deterministic <code>parameter_constraints</code> (SHA-256 <code>call_commitment</code> + <code>parameter_rules</code>).</td>
          <td>Prevents argument tampering and unauthorized parameter changes.</td>
        </tr>
        <tr>
          <td><strong>Deliverable Contract</strong></td>
          <td>No output contract; service output trusted.</td>
          <td>Mandatory <code>output_contract</code> with <code>expected_output_schema</code> and <code>strict_mode</code>.</td>
          <td>Requires output schema verification before funds move.</td>
        </tr>
        <tr>
          <td><strong>Deliverable Attestation</strong></td>
          <td>Not defined.</td>
          <td>Service signature over ticket, nonce, action, and canonical response body.</td>
          <td>Guarantees response authenticity and prevents replay.</td>
        </tr>
        <tr>
          <td><strong>Settlement</strong></td>
          <td>None / Coarse metadata.</td>
          <td>Circle USDC EIP-3009 or Macaroon caveat chains.</td>
          <td>Enables atomic post-execution settlement without smart contracts.</td>
        </tr>
        <tr>
          <td><strong>Front-Running Defense</strong></td>
          <td>Not defined.</td>
          <td>Mandates <code>receiveWithAuthorization</code> with relayer binding.</td>
          <td>Eliminates MEV bot interception in the public mempool.</td>
        </tr>
        <tr>
          <td><strong>JWK Curves</strong></td>
          <td>P-256 and secp256k1; y required.</td>
          <td>Adds Ed25519 (<code>OKP</code>) and conditional y coordinates.</td>
          <td>Supports Edwards-curve keys and their JWK representation.</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Normative Wire Rules</h2>
    <h3>3.1 Input <code>call_commitment</code></h3>
    <p>For standard Model Context Protocol method <code>tools/call</code>, clients and gateways MUST set:</p>
    <pre>canonicalization_target: "mcp_tool_arguments"</pre>
    <p>And compute the commitment as:</p>
    <pre>call_commitment = SHA-256(JCS(params.arguments))</pre>
    <p>where <code>JCS</code> is the canonical JSON byte sequence defined by RFC 8785.</p>

    <h3>3.2 Service Deliverable Attestation</h3>
    <p>When <code>output_contract.proof_of_deliverable.require_server_signature</code> is <code>true</code>, the service MUST compute:</p>
    <pre>digest = SHA-256(UTF-8(ticket_id || ":" || nonce || ":" || action || ":") || JCS(output_body))</pre>
    <p>and return the signature in the HTTP <code>PROOF-DELIVERABLE</code> header or JSON-RPC <code>_meta.proof_deliverable</code> encoded as Base64URL without padding.</p>

    <h2>4. Standardized Error Protocol</h2>
    <p>Gateways and agents MUST fail closed using standard machine-readable error codes:</p>
    <ul>
      <li><code>ERR_USDC_AUTHORIZATION_EXPIRED</code></li>
      <li><code>ERR_USDC_NONCE_ALREADY_USED</code></li>
      <li><code>ERR_USDC_INSUFFICIENT_FUNDS</code></li>
      <li><code>ERR_USDC_SIGNATURE_INVALID</code></li>
      <li><code>ERR_USDC_CALLER_UNAUTHORIZED</code></li>
      <li><code>ERR_USDC_CHAIN_MISMATCH</code></li>
      <li><code>ERR_DELIVERABLE_SCHEMA_MISMATCH</code></li>
      <li><code>ERR_DELIVERABLE_PAYLOAD_TOO_LARGE</code></li>
      <li><code>ERR_DELIVERABLE_TIMEOUT</code></li>
      <li><code>ERR_SERVER_SIGNATURE_INVALID</code></li>
      <li><code>ERR_SERVER_PROOF_REPLAYED</code></li>
      <li><code>ERR_MACAROON_CAVEAT_VIOLATION</code></li>
      <li><code>ERR_CALL_COMMITMENT_MISMATCH</code></li>
      <li><code>ERR_AUDIENCE_MISMATCH</code></li>
      <li><code>ERR_LIFESPAN_EXCEEDED</code></li>
      <li><code>ERR_BATCH_RPC_REJECTED</code></li>
    </ul>
  </div>
</body>
</html>`);
});

// --- 4. Legacy RFC-x401-01 Page ---
app.get("/rfc/x401-01", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  ${headStyles}
  <title>RFC-401-01: Agent Action Delegation & Boundary Control Protocol</title>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Portal</a></p>
    <h1>RFC-401-01: Agent Action Delegation Protocol (Legacy)</h1>
    <div class="card" style="margin-top: 10px;">
      <div><strong>Status:</strong> Obsoleted by <a href="/rfc/x401-02">RFC-x401-02</a></div>
      <div><strong>Category:</strong> Standards Track / HTTP Extension</div>
      <div><strong>Canonical Schema:</strong> <a href="/schemas/v1/agent-delegation-ticket.json">/schemas/v1/agent-delegation-ticket.json</a></div>
    </div>
    <h2>1. Abstract</h2>
    <p>The AED Framework standardizes zero-trust delegation over HTTP 401 challenges, providing programmatic constraints for tool allowlists, spend limits, and cross-MCP transfer boundaries using P-256 ECDSA and RFC 8785 JSON Canonicalization.</p>
  </div>
</body>
</html>`);
});

// --- 5. Interactive Ticket Debugger ---
app.get("/debugger", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  ${headStyles}
  <title>AED Ticket Inspector & Debugger</title>
  <style>
    textarea { width: 100%; height: 110px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; padding: 12px; font-family: monospace; font-size: 0.9rem; box-sizing: border-box; outline: none; }
    textarea:focus { border-color: #38bdf8; }
    pre { background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; color: #38bdf8; min-height: 220px; font-size: 0.9rem; }
    .status { padding: 10px 16px; border-radius: 8px; margin-top: 12px; font-weight: 600; font-size: 0.95rem; }
    .status.valid { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .status.invalid { background: #7f1d1d; color: #f87171; border: 1px solid #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/">&larr; Back to Portal</a></p>
    <h1>AED Ticket Debugger</h1>
    <p style="color: #94a3b8; margin-bottom: 24px;">Decode, inspect, and validate AED agent delegation tokens in real-time.</p>
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
        statusBox.textContent = "Valid Ticket Format (Issuer DID: " + (parsed.issuer?.did || parsed.principal?.subject_id || "Unknown") + " | AED v" + (parsed.aed_version || "1.0.0") + ")";
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