import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { X401Minter } from "../src/minter.js";
import { JWK_EC } from "../src/index.js";

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log("=== AED Framework Principal Minter ===");
  const did = await rl.question("Enter Principal DID (default: did:proof:user_demo): ") || "did:proof:user_demo";
  const agentId = await rl.question("Enter Target Agent ID: ");
  const nonce = await rl.question("Enter Gateway Challenge Nonce: ");
  const targetServer = await rl.question("Enter Allowed MCP Server URI: ");
  const allowedAction = await rl.question("Enter Allowed Action (e.g. issues:create): ");
  const budget = parseFloat(await rl.question("Enter Session Budget (USDC): "));

  console.log("\n--> Generating temporary keys for session delegation...");
  const humanIdentity = await X401Minter.generateIdentity(did);

  // Ephemeral agent key for testing
  const dummyAgentKey: JWK_EC = {
    kty: "EC",
    crv: "P-256",
    x: "f83OJ3D2xFmT4vGLb3GFKYCaNV_Z5OIDl80KSUq2cas",
    y: "x_da7W6tV_wBp369qKAx8uL6e5g81e8_yT1eF8vV1a0"
  };

  const { ticket, serializedToken } = await X401Minter.mintTicket(humanIdentity, {
    agentId,
    agentPublicKeyJwk: dummyAgentKey,
    challengeNonce: nonce,
    validitySeconds: 3600,
    permissions: {
      mcp_tools: [
        {
          server_origin: targetServer,
          allowed_actions: [allowedAction]
        }
      ],
      budget: {
        currency: "USDC",
        max_session_spend: budget,
        per_action_limit: budget / 2
      },
      cross_server_transfer: {
        allowed_routes: []
      }
    }
  });

  console.log("\n Delegation Ticket successfully minted and signed!");
  console.log("\n--- Full Ticket Payload ---");
  console.log(JSON.stringify(ticket, null, 2));
  console.log("\n--- Primary Authorization Header (AED Scheme) ---");
  console.log(`Authorization: AED ${serializedToken}`);
  console.log("\n--- Backward Compatible Header Options ---");
  console.log(`Authorization: X401 ${serializedToken}`);
  console.log(`PROOF-RESPONSE: ${serializedToken}`);

  rl.close();
}

main().catch(console.error);