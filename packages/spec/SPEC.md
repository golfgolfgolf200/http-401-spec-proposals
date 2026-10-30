# RFC-x401-01: Agent Action Delegation & Boundary Control Protocol

**Status:** Proposed Standard  
**Category:** Standards Track / HTTP Extension  
**Version:** 1.0.0  
**Schema URI:** `https://x401.tech/schemas/v1/agent-delegation-ticket.json`

---

## 1. Abstract
The x401 protocol standardizes HTTP-layer authorization challenges for autonomous agents. While the underlying proof infrastructure authenticates the human principal, this specification defines the **Delegation Ticket** contract. The Delegation Ticket cryptographically scopes what an agent is permitted to execute, enforcing per-action and session budgets, Model Context Protocol (MCP) tool whitelists, and cross-MCP context boundary rules without requiring centralized state.

## 2. HTTP Wire Mechanics

```text
Client (Agent)                Edge Gateway (Hono/Cloudflare)            Target MCP Server
|                                     |                                   |
| ---- 1. GET/POST /mcp/dispatch ---> |                                   |
|      (Unauthenticated)              |                                   |
|                                     |                                   |
| <--- 2. HTTP 401 Unauthorized ----- |                                   |
|      WWW-Authenticate: X401 ...     |                                   |
|      PROOF-REQUEST: <...>           |                                   |
|                                     |                                   |
| [Agent invokes Human Signer]        |                                   |
|                                     |                                   |
| ---- 3. POST /mcp/dispatch -------> |                                   |
|      PROOF-RESPONSE: <...>          |                                   |
|      (or Authorization: X401 <...>) |                                   |
|                                     | -- 4. Stateless Verify & Nonce -- |
|                                     |       KV Invalidation             |
|                                     |                                   |
|                                     | ---- 5. Forward RPC Call -------> |
|                                     | <--- 6. RPC Result -------------- |
|                                     |                                   |
| <--- 7. HTTP 200 OK --------------- |                                   |
|      PROOF-RESULT: <...>            |                                   |
```


### 2.1 Challenge Headers (`401 Unauthorized`)
When an unauthenticated or invalid agent request reaches an x401 gateway, the server MUST emit:
* `WWW-Authenticate: X401 realm="<gateway-realm>", challenge="<hex-nonce>", spec="https://x401.tech/schemas/v1/agent-delegation-ticket.json"`
* `PROOF-REQUEST: <base64-encoded JSON>` containing the required delegation scopes and validation nonce.

### 2.2 Response Headers
The agent retries the target endpoint providing either:
* `PROOF-RESPONSE: <base64url-encoded ticket>`
* `Authorization: X401 <base64url-encoded ticket>`

---

## 3. Cryptographic Signature Semantics
1. **Serialization:** The delegation ticket payload (excluding the top-level `signature` object) MUST be serialized according to **RFC 8785 (JSON Canonicalization Scheme - JCS)**.
2. **Algorithm:** The canonical byte sequence MUST be signed using **ECDSA with SHA-256 (ES256)** over the NIST P-256 (`secp256r1`) curve.
3. **Format:** The `signature.value` field MUST contain the 64-byte raw `R || S` concatenation encoded as Base64URL without padding.