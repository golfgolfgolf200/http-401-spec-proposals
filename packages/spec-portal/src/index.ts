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

// 2. Main Portal Homepage with Centered Header & HTTP 401 Challenge Context
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
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 0.92rem; }
    th, td { border: 1px solid #1e293b; padding: 12px; text-align: left; vertical-align: top; }
    th { background: #162036; color: #38bdf8; }
    tr:nth-child(even) { background: #0b1120; }
    .tag-server { color: #34d399; font-weight: 600; font-size: 0.82rem; background: #064e3b; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .tag-agent { color: #f472b6; font-weight: 600; font-size: 0.82rem; background: #831843; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .tag-dual { color: #fbbf24; font-weight: 600; font-size: 0.82rem; background: #78350f; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .subcard { background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; }
    .subcard h4 { margin-top: 0; margin-bottom: 8px; color: #7dd3fc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>AED (Agent Execution & Delegation) Framework</h1>
      <div class="author-tag">An open standard authored by <strong>Josh Hart</strong> &bull; <span class="badge">RFC-401-01</span></div>
    </div>
    
    <p class="desc">A zero-trust cryptographic authorization and boundary control standard for autonomous Model Context Protocol (MCP) agents. Built natively on the standard <code>HTTP 401 Unauthorized</code> challenge-response mechanism, AED intercepts unauthenticated actions with cryptographic challenge nonces—enforcing human-signed per-action budgets, tool allowlists, and cross-server confinement without centralized state.</p>
    
    <div class="card">
      <h3>Specification & Engineering Resources</h3>
      <ul>
        <li><a href="/rfc/x401-01">Read Formal Proposed Specification: RFC-401-01 (v1.0.0)</a></li>
        <li><a href="/schemas/v1/agent-delegation-ticket.json">Canonical JSON Schema (Draft 2020-12)</a></li>
        <li><a href="/debugger">Interactive Delegation Ticket Debugger & Inspector</a></li>
        <li>Live Challenge Gateway: <code>https://auth.x401.tech/challenge</code></li>
      </ul>
    </div>

    <div class="card">
      <h3>Ecosystem Context: Proof x401 vs. RFC-401-01</h3>
      <p>The <code>x401</code> protocol was pioneered by <a href="https://x401.proof.com/" target="_blank" rel="noreferrer">Proof</a> to establish human legal identity behind AI agents via OpenID4VP and Digital Credentials. <strong>RFC-401-01 (AED: Agent Execution & Delegation)</strong> formalizes the operational execution layer—transforming the <code>HTTP 401</code> identity handshake into an enforceable zero-trust permission envelope for Model Context Protocol (MCP) servers and autonomous runtimes.</p>
      
      <table>
        <thead>
          <tr>
            <th>Protocol Vector</th>
            <th>Proof Baseline (x401.proof.com)</th>
            <th>RFC-401-01 (AED: Agent Execution & Delegation)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Core Focus</strong></td>
            <td>Human KYC, Legal Entity Verification, and Agent Intent</td>
            <td>Fine-Grained Tool Sandboxing, Financial Limits, and Boundary Confinement</td>
          </tr>
          <tr>
            <td><strong>Identity Mechanism</strong></td>
            <td>OpenID4VP, W3C Verifiable Credentials (IAL2)</td>
            <td>Decentralized Identifiers (DIDs) & ECDSA P-256 (ES256) JWKs</td>
          </tr>
          <tr>
            <td><strong>Wire Protocol</strong></td>
            <td>HTTP 401 Challenge with URI match</td>
            <td>HTTP 401 Challenge with ephemeral single-use nonces and <code>WWW-Authenticate: AED</code></td>
          </tr>
          <tr>
            <td><strong>Canonicalization</strong></td>
            <td>JWS / JWT compact serialization</td>
            <td>Strict RFC 8785 JSON Canonicalization Scheme (JCS)</td>
          </tr>
          <tr>
            <td><strong>Operational Bounds</strong></td>
            <td>Route-level challenge (URI match)</td>
            <td>Per-tool action whitelists, session spend limits, and cross-MCP transfer matrices</td>
          </tr>
          <tr>
            <td><strong>Runtime Footprint</strong></td>
            <td>Requires OID4VP wallet handshakes & CIMD resolution</td>
            <td>Zero-dependency; native edge execution in Web Crypto API & Node.js runtimes</td>
          </tr>
          <tr>
            <td><strong>Anti-Replay Defense</strong></td>
            <td>Verifier nonce governed by wallet session lifecycles</td>
            <td>Atomic single-use challenge nonces burned on execution</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>Architecture Upgrades Enabled by RFC-401-01 (AED: Agent Execution & Delegation)</h3>
      <p>Conforming servers and agents implementing RFC-401-01 benefit from six foundational architectural capabilities:</p>
      
      <div class="grid">
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Cryptographic Tool ACLs</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Enforces granular <code>allowed_actions</code> and <code>denied_actions</code> directly on incoming MCP JSON-RPC requests, preventing prompt-injected agents from invoking unapproved tools.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Enforced Budget Controls</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Restricts spending via cryptographically signed <code>per_action_limit</code> and <code>max_session_spend</code> constraints, eliminating runaway loop risks during tool monetization.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-dual">STANDARDS</span> RFC 8785 Canonicalization</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Eliminates whitespace, key-ordering, and numeric formatting mismatches between Python, Rust, Go, and TypeScript runtimes via deterministic JSON canonicalization.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-server">SERVER</span> Atomic Nonce Consumption</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Guarantees that once a ticket is verified, its associated challenge nonce is invalidated in a single atomic transaction, mitigating race-condition replays.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-agent">AGENT</span> Cross-MCP Data Confinement</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Validates <code>cross_server_transfer</code> matrices to prevent automated multi-agent chains from leaking private artifacts between untrusted target servers.</p>
        </div>
        <div class="subcard">
          <h4><span class="tag-dual">STANDARDS</span> Zero-Dependency Verification</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0;">Engineered using standard Web Crypto primitives (<code>crypto.subtle</code>), allowing instant verification inside Cloudflare Workers, Edge Gateways, and headless runtimes.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

// 3. RFC Specification Rendered Page
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

// 4. Interactive Ticket Debugger
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