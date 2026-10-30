#!/usr/bin/env node
import { spawn } from "node:child_process";
import * as readline from "node:readline";
import { X401McpInterceptor } from "./proxy.js";

const args = process.argv.slice(2);
const separatorIdx = args.indexOf("--");

if (separatorIdx === -1 || separatorIdx === args.length - 1) {
  console.error("Usage: x401-mcp-proxy [options] -- <command> [args...]");
  console.error("Example: x401-mcp-proxy --server-origin https://api.mcp.local -- npx @modelcontextprotocol/server-filesystem /tmp");
  process.exit(1);
}

// Parse simple CLI flags
let serverOrigin = "mcp://local";
for (let i = 0; i < separatorIdx; i++) {
  if (args[i] === "--server-origin" && args[i + 1]) {
    serverOrigin = args[i + 1];
    i++;
  }
}

const childCmd = args[separatorIdx + 1];
const childArgs = args.slice(separatorIdx + 2);

const interceptor = new X401McpInterceptor({
  serverOrigin,
  challengeTtlSeconds: 300
});

// Spawn child MCP process
const child = spawn(childCmd, childArgs, {
  stdio: ["pipe", "pipe", "inherit"]
});

// Downstream client (Claude/Cursor) -> Upstream Server
const clientReader = readline.createInterface({
  input: process.stdin,
  terminal: false
});

clientReader.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const json = JSON.parse(trimmed);
    const result = await interceptor.interceptRequest(json);

    if (!result.allowed) {
      // Intercepted: return 401 challenge directly to client
      process.stdout.write(JSON.stringify(result.rpcResponse) + "\n");
    } else {
      // Allowed: forward to actual child process
      child.stdin.write(JSON.stringify(result.sanitizedRequest) + "\n");
    }
  } catch (err: any) {
    child.stdin.write(line + "\n");
  }
});

// Upstream Server -> Downstream Client
const childReader = readline.createInterface({
  input: child.stdout,
  terminal: false
});

childReader.on("line", (line) => {
  process.stdout.write(line + "\n");
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
