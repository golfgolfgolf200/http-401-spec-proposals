# RFC-x401-01: Agent Action Delegation & Boundary Control Protocol

**Status:** Proposed Standard  
**Category:** Standards Track / HTTP & MCP Extension  
**Version:** 1.0.0  
**Schema URI:** `https://x401.tech/schemas/v1/agent-delegation-ticket.json`

---

## 1. Abstract
The x401 Delegation Framework defines an open delegation standard for autonomous agents operating over HTTP- and JSON-RPC-based MCP transports. It standardizes the challenge/response flow used to request a human-signed Delegation Ticket and the cryptographic constraints that bound an agent to specific permissions. While the underlying proof infrastructure authenticates the human principal, this specification defines the **Delegation Ticket** contract. The ticket cryptographically scopes what an agent is permitted to execute, enforcing per-action and session budgets, Model Context Protocol (MCP) tool allowlists, and cross-MCP context-boundary rules without requiring centralized state.

## 2. Wire Mechanics

```text
Client (Agent)                 Edge Gateway (Hono/Cloudflare)           Target MCP Server
|                                      |                                     |
| ---- 1. tools/call (without ticket) -> |                                     |
|      (or unauthenticated HTTP call)  |                                     |
|                                      |                                     |
| <--- 2. 401 challenge / rejection --- |                                     |
|      (HTTP 401 or JSON-RPC error)     |                                     |
|      challenge.nonce + schema_uri      |                                     |
|                                      |                                     |
| [Agent obtains principal sign-off]   |                                     |
|                                      |                                     |
| ---- 3. tools/call + ticket --------> |                                     |
|      params._meta.x401_ticket        |                                     |
|      or Authorization: X401 <...>     |                                     |
|                                      | -- 4. Stateless verify & nonce -- |
|                                      |     invalidation + policy check    |
|                                      |                                     |
|                                      | ---- 5. Forward RPC call -------> |
|                                      | <--- 6. RPC result ------------- |
|                                      |                                     |
| <--- 7. HTTP 200 OK / JSON-RPC 200 - |                                     |
```

### 2.1 Challenge Semantics (`401 Unauthorized`)
When an unauthenticated or invalid agent request reaches an x401 gateway, the server MUST issue a challenge that identifies the required schema and the single-use nonce. For HTTP transports, the server SHOULD emit:

* `WWW-Authenticate: X401 realm="<gateway-realm>", nonce="<hex-nonce>", schema="https://x401.tech/schemas/v1/agent-delegation-ticket.json"`

For JSON-RPC transports, the server MUST return a `401` error object containing a `challenge` payload with at least:

* `nonce`
* `schema_uri`
* `accepted_algorithms`
* `expires_in_seconds`

### 2.2 Ticket Submission
The agent retries the target request by supplying the signed ticket in one of the following ways:

* JSON-RPC metadata: `params._meta.x401_ticket`
* HTTP authorization: `Authorization: X401 <base64url-encoded ticket>`
* HTTP proof header: `PROOF-RESPONSE: <base64url-encoded ticket>`

Implementations MAY support any combination of the above forms, but they MUST all carry the same canonical ticket object.

---

## 3. Cryptographic Signature Semantics
1. **Serialization:** The delegation ticket payload (excluding the top-level `signature` object) MUST be serialized according to **RFC 8785 (JSON Canonicalization Scheme - JCS)**.
2. **Algorithm:** The canonical byte sequence MUST be signed using **ECDSA with SHA-256 (ES256)** over the NIST P-256 (`secp256r1`) curve.
3. **Format:** The `signature.value` field MUST contain the raw `R || S` concatenation encoded as Base64URL without padding.

---

## 4. Specification Status & Attribution
The x401 Delegation Framework is an independent specification. References to HTTP 401 denote standard HTTP semantics (RFC 9110) and do not imply affiliation with, sponsorship by, or endorsement from any third-party protocol implementation.
