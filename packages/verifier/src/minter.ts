import {
  canonicalizeJSON,
  uint8ArrayToBase64Url,
  X401DelegationTicket,
  TicketPermissions,
  JWK_EC
} from "./index.js";

export interface MinterKeypair {
  did: string;
  verificationMethodUri: string;
  privateKey: CryptoKey;
  publicKeyJwk: JWK_EC;
}

export interface MintTicketParams {
  agentId: string;
  agentPublicKeyJwk: JWK_EC;
  challengeNonce: string;
  validitySeconds: number;
  permissions: TicketPermissions;
}

export class X401Minter {
  /**
   * Generates a local P-256 keypair for testing or self-sovereign identity usage.
   */
  public static async generateIdentity(did: string): Promise<MinterKeypair> {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    const publicKeyJwk = (await crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    )) as JWK_EC;

    return {
      did,
      verificationMethodUri: `${did}#key-1`,
      privateKey: keyPair.privateKey,
      publicKeyJwk
    };
  }

  /**
   * Imports a PKCS#8 PEM private key (e.g., from OpenSSL or an enterprise wallet).
   */
  public static async importPrivateKeyFromPem(
    pem: string,
    did: string,
    publicKeyJwk: JWK_EC
  ): Promise<MinterKeypair> {
    const cleanPem = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");
    const binary = atob(cleanPem);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      bytes,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );

    return {
      did,
      verificationMethodUri: `${did}#key-1`,
      privateKey,
      publicKeyJwk
    };
  }

  /**
   * Signs and formats an x401 Delegation Ticket according to RFC 8785 + ES256.
   */
  public static async mintTicket(
    identity: MinterKeypair,
    params: MintTicketParams
  ): Promise<{ ticket: X401DelegationTicket; serializedToken: string }> {
    const now = Math.floor(Date.now() / 1000);

    const ticketBody: Omit<X401DelegationTicket, "signature"> = {
      x401_version: "1.0.0",
      ticket_id: crypto.randomUUID(),
      issuer: {
        did: identity.did,
        verification_method: identity.verificationMethodUri,
        public_key_jwk: identity.publicKeyJwk
      },
      subject_agent: {
        agent_id: params.agentId,
        public_key_jwk: params.agentPublicKeyJwk
      },
      issued_at: now,
      expires_at: now + params.validitySeconds,
      nonce: params.challengeNonce,
      permissions: params.permissions
    };

    const canonicalBytes = new TextEncoder().encode(canonicalizeJSON(ticketBody));
    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      identity.privateKey,
      canonicalBytes
    );

    const ticket: X401DelegationTicket = {
      ...ticketBody,
      signature: {
        algorithm: "ES256",
        value: uint8ArrayToBase64Url(new Uint8Array(signatureBuffer))
      }
    };

    const serializedToken = uint8ArrayToBase64Url(
      new TextEncoder().encode(JSON.stringify(ticket))
    );

    return { ticket, serializedToken };
  }
}