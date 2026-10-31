# RFC-x401-02: Verifiable Agent Action Delegation & Zero-Contract Settlement Protocol

- **Status:** Proposed Standard
- **Category:** Standards Track / HTTP & MCP Extension
- **Version:** 2.0.0
- **Obsoletes:** RFC-x401-01 (v1.0.0)
- **Schema URI:** <https://401frameworks.org/schemas/v2/agent-delegation-ticket.json>

## 1. Abstract

The x401 Protocol defines a verifiable delegation ticket and its enforcement and settlement rules for agent-authorized actions over HTTP and Model Context Protocol (MCP) interfaces, including x402-style services.

The proposal's design goal is to make zero assumptions about any particular agent design or any particular x402/MCP service implementation. It does not prescribe an agent's reasoning method, framework, runtime, or internal architecture, nor a service's language, framework, transport implementation, hosting, or internal architecture. It specifies only the interoperable ticket fields and the behavior required at the protocol boundary.

RFC-x401-01 established authorization allowlists and static budget thresholds. Version 2.0.0 adds audience binding, deterministic input commitments, output contracts, optional deliverable attestations, post-execution settlement using Circle USDC EIP-3009 `receiveWithAuthorization` or Macaroon caveat chains, and typed fail-closed errors.

## 2. Evolution from v1 to v2

The following table summarizes the primary changes from RFC-x401-01 (v1.0.0) to RFC-x401-02 (v2.0.0).

| Feature | RFC-x401-01 (v1.0.0) | RFC-x401-02 (v2.0.0) | Rationale |
| --- | --- | --- | --- |
| Schema | `/schemas/v1/agent-delegation-ticket.json` | `/schemas/v2/agent-delegation-ticket.json` | A new major version identifies the expanded ticket contract. |
| Audience binding | Not defined; cross-gateway replay may be possible. | Mandatory audience URI. | Restricts a ticket to its intended gateway. |
| Input enforcement | Coarse tool-name allowlists (`allowed_actions`). | Deterministic `parameter_constraints`, including `call_commitment` and `parameter_rules`. | Prevents argument tampering and unauthorized parameter changes. |
| Deliverable contract | No output contract; service output is trusted. | Mandatory `output_contract`, including `expected_output_schema` and `strict_mode`. | Requires output validation before settlement. |
| Deliverable attestation | Not defined. | Optional service signature over a digest of the ticket, nonce, action, and canonical response body. | Supports verification that a response is bound to the delegated request. |
| Settlement | No settlement rail or coarse settlement metadata. | Circle USDC EIP-3009 or Macaroon caveat chains. | Enables settlement after the deliverable has been verified, without custom escrow contracts. |
| Front-running defense | Not defined. | Uses `receiveWithAuthorization` with the recipient set to the authorized relayer. | Restricts who can submit the signed authorization. |
| Cross-chain invariants | Network and currency represented as unchecked strings. | Strict `network` / `chain_id` pairing for supported chains (1, 8453, 42161, 137). | Prevents network confusion and cross-chain signature reuse. |
| JWK curves | P-256 and secp256k1; `y` is required. | Adds Ed25519 (`OKP`) and conditional `y` requirements. | Supports Edwards-curve keys and their JWK representation. |
| Signature malleability | No canonical S-scalar requirement. | Canonical S-scalar enforcement. | Prevents signature malleability in EVM and gateway verification. |
| Error protocol | Generic HTTP 401 or JSON-RPC errors. | Typed `error_handling.supported_error_codes`. | Makes failure behavior deterministic and fail-closed. |

## 3. Protocol scope and design goal

This specification defines a contract at the boundary between a ticket holder, a verifying gateway, and a requested action. It does not define or constrain how an agent decides to make a request or how a service implements that action.

“Zero assumptions” refers to implementation and design choices, not to the absence of protocol requirements. Participants MUST follow the ticket semantics and wire-level rules in this specification; they remain free to choose how their internal systems produce and process the required data.

| The protocol defines | The protocol does not prescribe |
| --- | --- |
| Ticket claims, signature and audience checks. | Agent architecture, reasoning, planning, or orchestration. |
| How request parameters are committed and constrained. | Agent framework, runtime, language, or tool-selection strategy. |
| How a deliverable is validated and, when required, attested. | Service internals, implementation language, framework, or hosting. |
| When and how the selected settlement rail may be used. | A particular MCP server or x402 service design. |
| Machine-readable failure codes and fail-closed behavior. | Internal communication or execution between an agent and its tools. |

Conformance therefore depends on observable protocol behavior, not on adopting a particular agent or service implementation. A conforming gateway evaluates the ticket and request at the protocol boundary; it need not inspect or understand the agent's internal decision process or the service's internal execution.

The protocol does require the relevant participants to exchange the defined ticket and wire-level data. For example, when a ticket requires a deliverable signature, the service must provide that attestation in the specified response metadata. This is a protocol obligation, not a requirement to use any particular service architecture.

The agent carries the delegation ticket, not the principal's root private key. For EIP-3009 settlement, the principal or treasury supplies the signed authorization; the gateway relays it only after the ticket's conditions have been met.

Version 2.0.0 does not require custom escrow smart contracts. Its settlement options use Circle USDC EIP-3009 or off-chain Macaroon caveat and discharge verification.

## 4. Normative wire rules

### 4.1 Input `call_commitment`

To ensure consistent commitments across RPC implementations, clients and gateways MUST use the canonicalization target corresponding to the request form.

#### MCP `tools/call`

For the standard Model Context Protocol method `tools/call`, the client and gateway MUST set:

```text
canonicalization_target: "mcp_tool_arguments"
```

They MUST compute the commitment as:

```text
call_commitment = SHA-256(JCS(params.arguments))
```

Here, JCS is the canonical JSON byte sequence defined by RFC 8785.

#### Raw JSON-RPC parameters

For custom, unnested JSON-RPC methods that pass parameters directly in the `params` property, the client and gateway MUST set:

```text
canonicalization_target: "jsonrpc_raw_params"
```

They MUST compute the commitment as:

```text
call_commitment = SHA-256(JCS(params))
```

#### Batch requests

When `disallow_batch_rpc` is `true`, gateways MUST reject JSON-RPC batch arrays and respond with `ERR_BATCH_RPC_REJECTED`.

### 4.2 Service deliverable attestation

When `output_contract.proof_of_deliverable.require_server_signature` is `true`:

1. The service MUST serialize the deliverable response body according to RFC 8785.
2. The service MUST compute the composite digest:

   ```text
   digest = SHA-256(UTF-8(ticket_id || ":" || nonce || ":" || action || ":") || JCS(output_body))
   ```

3. The service MUST sign the digest with its attestation key and encode the signature as Base64URL without padding. It MUST return that same encoded value in either the HTTP `PROOF-DELIVERABLE` header or JSON-RPC `_meta.proof_deliverable`; the encoding MUST NOT vary by transport.
4. The gateway MUST verify the signature before releasing EIP-3009 payment or issuing a Macaroon discharge token.

## 5. Settlement mechanics

### 5.1 Circle USDC EIP-3009 rail

The `circle_usdc_eip3009` authorization type MUST use `receiveWithAuthorization`.

The ticket recipient MUST be the gateway's authorized relayer address. In Circle's canonical implementation, `receiveWithAuthorization` requires `msg.sender == to`, so only that gateway relayer can broadcast the transaction.

The settlement sequence is:

1. The gateway verifies request parameters against `parameter_constraints`.
2. The gateway forwards the request to the requested service.
3. The gateway validates the response against `output_contract.expected_output_schema`.
4. The gateway verifies the `PROOF-DELIVERABLE` attestation when required.
5. On success, the gateway broadcasts `receiveWithAuthorization(...)` and forwards the verified response to the agent.
6. On failure or timeout, the gateway discards the signed payload. If `valid_before` passes without execution, the authorization expires without transferring USDC.

### 5.2 Macaroon caveat chain rail

For `macaroon_caveat_chain`:

1. The principal creates a base Macaroon bound to `root_key_id`.
2. First-party caveats bind attenuation parameters, such as `call_commitment`.
3. A third-party caveat is addressed to the `arbitrator_gateway`.
4. The service submits its output to the gateway to obtain the cryptographic discharge token that unlocks payment release.

## 6. Standardized error protocol

Gateways, relayers, and agents MUST fail closed and return machine-readable errors. The following codes are defined:

| Error code | Meaning |
| --- | --- |
| `ERR_USDC_AUTHORIZATION_EXPIRED` | `valid_before` has passed or the remaining validity buffer is insufficient. |
| `ERR_USDC_NONCE_ALREADY_USED` | The EIP-3009 authorization nonce has already been executed on-chain. |
| `ERR_USDC_INSUFFICIENT_FUNDS` | The authorizer wallet lacks the required balance. |
| `ERR_USDC_SIGNATURE_INVALID` | EIP-712 signature recovery failed. |
| `ERR_USDC_CALLER_UNAUTHORIZED` | The authorization was submitted by an address other than the recipient. |
| `ERR_USDC_CHAIN_MISMATCH` | `budget.network` does not match `circle_usdc_eip3009.chain_id`. |
| `ERR_DELIVERABLE_SCHEMA_MISMATCH` | The service response failed JSON Schema validation. |
| `ERR_DELIVERABLE_PAYLOAD_TOO_LARGE` | The service response exceeded `max_payload_bytes`. |
| `ERR_DELIVERABLE_TIMEOUT` | The service exceeded `max_latency_ms`. |
| `ERR_SERVER_SIGNATURE_INVALID` | The service's `PROOF-DELIVERABLE` attestation failed verification. |
| `ERR_SERVER_PROOF_REPLAYED` | The service replayed an attestation from a previous ticket or nonce. |
| `ERR_MACAROON_CAVEAT_VIOLATION` | The incoming Macaroon failed a caveat predicate. |
| `ERR_CALL_COMMITMENT_MISMATCH` | The canonical parameter hash does not match the ticket commitment. |
| `ERR_AUDIENCE_MISMATCH` | The ticket audience does not match the verifying gateway origin. |
| `ERR_LIFESPAN_EXCEEDED` | The interval between `issued_at` and `expires_at` exceeds `max_ttl_seconds`. |
| `ERR_BATCH_RPC_REJECTED` | A JSON-RPC batch was received when `disallow_batch_rpc` is `true`. |

## 7. Specification status and attribution

The x401 Delegation Framework is an independent specification. References to HTTP 401 denote standard HTTP semantics (RFC 9110) and do not imply affiliation with, sponsorship by, or endorsement from any third-party protocol implementation.
