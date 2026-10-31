import { verifyX401Ticket } from "@x401/verifier";

export interface McpToolPermission {
  server_origin: string;
  allowed_actions: string[];
  denied_actions?: string[];
}

export interface TicketPayload {
  x401_version?: string;
  aed_version?: string;
  ticket_id: string;
  issuer?: {
    did?: string;
    verification_method?: string;
    public_key_jwk?: Record<string, any>;
  };
  principal?: {
    subject_id?: string;
    identity_provider?: string;
    public_key?: Record<string, any>;
  };
  subject_agent?: {
    agent_id: string;
    public_key_jwk: Record<string, any>;
  };
  issued_at: number;
  expires_at: number;
  nonce: string;
  permissions?: {
    mcp_tools?: McpToolPermission[];
    budget?: {
      currency: string;
      max_session_spend: number;
      per_action_limit: number;
    };
    cross_server_transfer?: {
      allowed_routes: any[];
    };
  };
  signature?: {
    algorithm: string;
    value: string;
  };
  [key: string]: any;
}

export interface ProxySecurityPolicy {
  serverOrigin: string;
  allowedIssuers?: Set<string>;
  defaultMaxSpendPerAction?: number;
  currency?: string;
  challengeTtlSeconds?: number;
}

export interface InterceptResult {
  allowed: boolean;
  rpcResponse?: Record<string, any>;
  sanitizedRequest?: Record<string, any>;
}

export class X401McpInterceptor {
  private activeChallenges: Map<string, number> = new Map();
  private burnedNonces: Set<string> = new Set();

  constructor(private policy: ProxySecurityPolicy) {
    setInterval(() => this.purgeExpired(), 30_000).unref();
  }

  public issueChallengeNonce(): string {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const ttl = (this.policy.challengeTtlSeconds || 300) * 1000;
    this.activeChallenges.set(nonce, Date.now() + ttl);
    return nonce;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.activeChallenges.entries()) {
      if (now > expiry) this.activeChallenges.delete(nonce);
    }
  }

  public create401Challenge(rpcId: any, toolName: string, reason: string): Record<string, any> {
    const nonce = this.issueChallengeNonce();
    return {
      jsonrpc: "2.0",
      id: rpcId,
      error: {
        code: 401,
        message: "AED_AUTHENTICATION_REQUIRED",
        data: {
          error: "Delegation Ticket Required",
          reason,
          target_tool: toolName,
          server_origin: this.policy.serverOrigin,
          challenge: {
            scheme: "AED",
            nonce,
            schema_uri: "https://401frameworks.org/schemas/v1/agent-delegation-ticket.json",
            accepted_algorithms: ["ES256"],
            expires_in_seconds: this.policy.challengeTtlSeconds || 300
          }
        }
      }
    };
  }

  public async interceptRequest(rawMessage: Record<string, any>): Promise<InterceptResult> {
    const { method, params, id } = rawMessage;

    if (method !== "tools/call") {
      return { allowed: true, sanitizedRequest: rawMessage };
    }

    const toolName = params?.name;
    const meta = params?._meta || {};
    const rawTicket = meta.aed_ticket || meta.x401_ticket || meta.authorization;

    if (!rawTicket) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "No AED/x401 delegation ticket provided in params._meta")
      };
    }

    let ticket: TicketPayload;
    try {
      if (typeof rawTicket === "string") {
        let clean = rawTicket.trim();
        if (clean.startsWith("Authorization: AED ")) clean = clean.slice(19).trim();
        if (clean.startsWith("Authorization: X401 ")) clean = clean.slice(20).trim();
        if (clean.startsWith("AED ")) clean = clean.slice(4).trim();
        if (clean.startsWith("X401 ")) clean = clean.slice(5).trim();
        const jsonStr = Buffer.from(clean, "base64url").toString("utf-8");
        ticket = JSON.parse(jsonStr);
      } else {
        ticket = rawTicket;
      }
    } catch {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Malformed ticket encoding (expected valid Base64URL JSON)")
      };
    }

    const issuerId = ticket.issuer?.did || ticket.principal?.subject_id || "";
    if (this.policy.allowedIssuers && !this.policy.allowedIssuers.has(issuerId)) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Untrusted issuer " + issuerId + " not in approved Trust List")
      };
    }

    const nonce = ticket.nonce;
    if (this.burnedNonces.has(nonce)) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Nonce has already been consumed (replay attack detected)")
      };
    }

    const expiry = this.activeChallenges.get(nonce);
    if (!expiry || Date.now() > expiry) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Invalid or expired challenge nonce")
      };
    }

    let verification: any;
    try {
      verification = await verifyX401Ticket(ticket as any);
    } catch (err: any) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Ticket validation error: " + err.message)
      };
    }

    if (!verification?.valid) {
      const errReason = (verification && "reason" in verification) ? verification.reason : "Invalid ECDSA signature or claims mismatch";
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Cryptographic signature failed: " + errReason)
      };
    }

    const toolPermissions = ticket.permissions?.mcp_tools?.find(
      (t: McpToolPermission) => t.server_origin === this.policy.serverOrigin || t.server_origin === "*"
    );

    if (!toolPermissions) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Ticket grants no tool rights for server " + this.policy.serverOrigin)
      };
    }

    if (toolPermissions.denied_actions?.includes(toolName)) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Tool " + toolName + " is explicitly blacklisted in ticket")
      };
    }

    if (!toolPermissions.allowed_actions.includes("*") && !toolPermissions.allowed_actions.includes(toolName)) {
      return {
        allowed: false,
        rpcResponse: this.create401Challenge(id, toolName, "Tool " + toolName + " is not in allowed_actions whitelist")
      };
    }

    this.activeChallenges.delete(nonce);
    this.burnedNonces.add(nonce);

    return { allowed: true, sanitizedRequest: rawMessage };
  }
}