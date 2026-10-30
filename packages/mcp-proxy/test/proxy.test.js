import test from "node:test";
import assert from "node:assert";
import { X401McpInterceptor } from "../dist/proxy.js";

test("x401 Interceptor: Allows initialize and tools/list without tickets", async () => {
  const proxy = new X401McpInterceptor({ serverOrigin: "https://auth.x401.tech" });

  const initRes = await proxy.interceptRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {}
  });
  assert.strictEqual(initRes.allowed, true);

  const listRes = await proxy.interceptRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  });
  assert.strictEqual(listRes.allowed, true);
});

test("x401 Interceptor: Issues 401 challenge on unauthenticated tools/call", async () => {
  const proxy = new X401McpInterceptor({ serverOrigin: "https://auth.x401.tech" });

  const callRes = await proxy.interceptRequest({
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: {
      name: "delete_database",
      arguments: {}
    }
  });

  assert.strictEqual(callRes.allowed, false);
  assert.strictEqual(callRes.rpcResponse?.error?.code, 401);
  assert.strictEqual(callRes.rpcResponse?.error?.data?.challenge?.schema_uri, "https://x401.tech/schemas/v1/agent-delegation-ticket.json");
  assert.ok(callRes.rpcResponse?.error?.data?.challenge?.nonce);
});

test("x401 Interceptor: Rejects unissued nonces or missing tickets", async () => {
  const proxy = new X401McpInterceptor({ serverOrigin: "https://auth.x401.tech" });

  const dummyTicket = {
    x401_version: "1.0.0",
    ticket_id: "00000000-0000-0000-0000-000000000000",
    nonce: "non_existent_nonce_1234567890",
    permissions: {
      mcp_tools: [{ server_origin: "*", allowed_actions: ["*"] }]
    }
  };

  const res = await proxy.interceptRequest({
    jsonrpc: "2.0",
    id: 99,
    method: "tools/call",
    params: {
      name: "run_job",
      _meta: { x401_ticket: dummyTicket }
    }
  });

  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.rpcResponse?.error?.code, 401);
  assert.ok(res.rpcResponse?.error?.data?.reason.includes("Invalid or expired challenge nonce"));
});
