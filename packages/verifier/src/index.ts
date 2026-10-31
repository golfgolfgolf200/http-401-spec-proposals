export interface JWK_EC {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

export interface MCPRule {
  server_origin: string;
  allowed_actions: string[];
  denied_actions?: string[];
}

export interface CrossServerRoute {
  from_server: string;
  to_server: string;
  allowed_artifact_types?: string[];
}

export interface BudgetConstraint {
  currency: "USDC" | "USD" | "EUR";
  network?: string;
  max_session_spend: number;
  per_action_limit: number;
}

export interface TicketPermissions {
  mcp_tools: MCPRule[];
  budget?: BudgetConstraint;
  cross_server_transfer: {
    allowed_routes: CrossServerRoute[];
  };
}

export interface X401DelegationTicket {
  x401_version?: "1.0.0";
  aed_version?: "1.0.0";
  ticket_id: string;
  issuer: {
    did: string;
    verification_method: string;
    public_key_jwk: JWK_EC;
  };
  subject_agent: {
    agent_id: string;
    public_key_jwk: JWK_EC;
  };
  issued_at: number;
  expires_at: number;
  nonce: string;
  permissions: TicketPermissions;
  signature: {
    algorithm: "ES256";
    value: string;
  };
}

// Canonical Aliases for AED Standard
export type AEDDelegationTicket = X401DelegationTicket;

export interface VerificationOptions {
  expectedNonce?: string;
  currentTimestamp?: number;
  targetServer?: string;
  requestedAction?: string;
  spendAmount?: number;
  transferCheck?: {
    fromServer: string;
    toServer: string;
    artifactType?: string;
  };
}

export class X401VerificationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "X401VerificationError";
  }
}
export class AEDVerificationError extends X401VerificationError {}

export function canonicalizeJSON(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJSON(item)).join(",")}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalizeJSON(val)}`;
  });
  return `{${entries.join(",")}}`;
}

export function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyX401Ticket(
  ticket: X401DelegationTicket,
  options: VerificationOptions = {}
): Promise<{ valid: boolean; principalId: string; agentId: string }> {
  const now = options.currentTimestamp ?? Math.floor(Date.now() / 1000);

  if (now > ticket.expires_at) {
    throw new X401VerificationError("Ticket has expired", "ERR_EXPIRED");
  }
  if (now < ticket.issued_at - 60) {
    throw new X401VerificationError(
      "Ticket issued in the future (clock skew exceeded)",
      "ERR_NOT_YET_VALID"
    );
  }

  if (options.expectedNonce && ticket.nonce !== options.expectedNonce) {
    throw new X401VerificationError("Nonce mismatch; replay detected", "ERR_INVALID_NONCE");
  }

  const { signature, ...ticketBody } = ticket;
  const canonicalBytes = new TextEncoder().encode(canonicalizeJSON(ticketBody));

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      {
        kty: ticket.issuer.public_key_jwk.kty,
        crv: ticket.issuer.public_key_jwk.crv,
        x: ticket.issuer.public_key_jwk.x,
        y: ticket.issuer.public_key_jwk.y,
        ext: true
      },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  } catch {
    throw new X401VerificationError("Failed to parse issuer JWK", "ERR_MALFORMED_KEY");
  }

  const sigBytes = base64UrlToUint8Array(signature.value);
  const isSignatureValid = await crypto.subtle.verify(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    sigBytes as unknown as ArrayBuffer,
    canonicalBytes as unknown as ArrayBuffer
  );

  if (!isSignatureValid) {
    throw new X401VerificationError(
      "Invalid cryptographic signature over canonical payload",
      "ERR_SIG_INVALID"
    );
  }

  if (options.targetServer && options.requestedAction) {
    const serverRule = ticket.permissions.mcp_tools.find(
      (rule) => rule.server_origin === options.targetServer
    );
    if (!serverRule) {
      throw new X401VerificationError(
        `Target server ${options.targetServer} is not authorized in ticket`,
        "ERR_ORIGIN_UNAUTHORIZED"
      );
    }

    if (serverRule.denied_actions?.includes(options.requestedAction)) {
      throw new X401VerificationError(
        `Action ${options.requestedAction} explicitly denied on target server`,
        "ERR_ACTION_DENIED"
      );
    }

    const isWildcardAllowed = serverRule.allowed_actions.includes("*");
    const isDirectlyAllowed = serverRule.allowed_actions.includes(options.requestedAction);
    if (!isWildcardAllowed && !isDirectlyAllowed) {
      throw new X401VerificationError(
        `Action ${options.requestedAction} is not permitted`,
        "ERR_ACTION_UNAUTHORIZED"
      );
    }
  }

  if (options.spendAmount !== undefined && ticket.permissions.budget) {
    if (options.spendAmount > ticket.permissions.budget.per_action_limit) {
      throw new X401VerificationError(
        `Requested spend (${options.spendAmount}) exceeds per-action limit (${ticket.permissions.budget.per_action_limit})`,
        "ERR_PER_ACTION_BUDGET_EXCEEDED"
      );
    }
    if (options.spendAmount > ticket.permissions.budget.max_session_spend) {
      throw new X401VerificationError(
        `Requested spend (${options.spendAmount}) exceeds session budget (${ticket.permissions.budget.max_session_spend})`,
        "ERR_TOTAL_BUDGET_EXCEEDED"
      );
    }
  }

  if (options.transferCheck) {
    const routeAllowed = ticket.permissions.cross_server_transfer.allowed_routes.some((route) => {
      const matchEndpoints =
        route.from_server === options.transferCheck!.fromServer &&
        route.to_server === options.transferCheck!.toServer;
      if (!matchEndpoints) return false;
      if (!options.transferCheck!.artifactType) return true;
      if (!route.allowed_artifact_types) return true;
      return route.allowed_artifact_types.includes(options.transferCheck!.artifactType);
    });

    if (!routeAllowed) {
      throw new X401VerificationError(
        `Cross-server transfer violation from ${options.transferCheck.fromServer} to ${options.transferCheck.toServer}`,
        "ERR_CROSS_MCP_VIOLATION"
      );
    }
  }

  return {
    valid: true,
    principalId: ticket.issuer.did,
    agentId: ticket.subject_agent.agent_id
  };
}

export const verifyAEDTicket = verifyX401Ticket;