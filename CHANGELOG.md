# Changelog

All notable changes to the AED (Agent Execution & Delegation) Framework ecosystem will be documented in this file.

## [0.2.0] - 2026-10-31

### Added
- **AED Token Format:** Added `aed_version: "1.0.0"` support to `AEDDelegationTicket` interfaces and canonical JSON schemas.
- **Dual Scheme Authorization:** Added native handling for `Authorization: AED <token>` alongside legacy `X401` and `Bearer` headers in both the gateway and the MCP proxy interceptor.
- **SSRF Hardening Validator:** Implemented asynchronous DNS resolution verification (`node:dns/promises`) in `validate-url.ts` to inspect target socket IP addresses and prevent DNS rebinding against private RFC 1918, link-local, and ULA IPv6 subnets.
- **CLI Binary Aliases:** Added `aed-mcp-proxy` executable alias to `@x401/mcp-proxy` alongside `x401-mcp-proxy`.
- **Interactive Ticket Debugger:** Added real-time token inspector and JSON claim decoder on `401frameworks.org/debugger`.

### Changed
- **Branding Migration:** Renamed standard and tooling surface from `x401` to **AED (Agent Execution & Delegation) Framework**.
- **Canonical Domain:** Migrated formal specification host, schema identifiers (`$id`), and challenge descriptors to `https://401frameworks.org`.
- **Spec Portal UX:** Center-aligned hero layout, styled RFC proposal badging, and added documentation clarifying the native `HTTP 401 Unauthorized` challenge-response mechanics.
- **Schema Compatibility:** Updated `agent-delegation-ticket.json` to allow either `aed_version` or legacy `x401_version` via JSON Schema `anyOf` constraints.
- **Minter Tooling:** Updated `packages/verifier/scripts/mint-cli.ts` to output `Authorization: AED <token>` by default with backward-compatible fallback blocks.

### Security
- **Atomic Nonce Consumption:** Replay protection enforced via atomic SQLite `DELETE ... RETURNING nonce` transactions on the gateway daemon and Workers KV atomic deletes on the edge.
- **Private Gateway Sanitizer:** Added `validate-url.ts` to root `.gitignore` to keep internal network verification rules private while publishing open specification assets.

### Fixed
- **TypeScript Workspace Configs:** Resolved type-check errors across `@x401/verifier` and `@x401/mcp-proxy` by isolating script/test configurations and explicitly scoping `@types/node`.
