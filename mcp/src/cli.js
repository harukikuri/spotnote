#!/usr/bin/env node
// spotnote-mcp — Spotnote's MCP server. The agent starts it (stdio):
//
//   claude mcp add spotnote -- npx -y spotnote-mcp
//
// Browsers reach it on 127.0.0.1:4848 (SPOTNOTE_PORT). Every agent session
// starts its own copy, but only one can own the port: that one keeps the notes
// (see store.js), and the others relay their agent's tool calls to it. When the
// owner exits, a relay takes over the port.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStore } from "./store.js";
import { createRunner, registerTools, INSTRUCTIONS } from "./tools.js";
import { createHttpServer } from "./http.js";

const PORT = Number(process.env.SPOTNOTE_PORT) || 4848;
const BASE = `http://127.0.0.1:${PORT}`;
const cwd = process.cwd(); // the agent's project: it only sees notes from apps in here
const agent = Math.random().toString(36).slice(2); // this agent session, for "working" (see store.js)
const log = (msg) => console.error(`[spotnote-mcp] ${msg}`); // stdout is the MCP channel

let owner = null; // { store, runTool } once this process owns the port

async function becomeOwner() {
  const store = createStore();
  const runTool = createRunner(store);
  const server = createHttpServer(store, runTool);
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(PORT, "127.0.0.1", ok);
  });
  owner = { store, runTool };
  log(`serving browsers on ${BASE}`);
}

async function isSpotnote() {
  try {
    return (await (await fetch(`${BASE}/health`)).json()).spotnote === 1;
  } catch {
    return false;
  }
}

async function call(name, args, signal) {
  if (owner) return owner.runTool(name, args, cwd, signal, agent);
  try {
    const res = await fetch(`${BASE}/rpc`, { method: "POST", body: JSON.stringify({ tool: name, args, cwd, agent }), signal });
    return await res.json();
  } catch {
    if (signal?.aborted) return { text: "Cancelled." };
    // The owner went away mid-call: take its place and run the call here.
    if (await becomeOwner().then(() => true, () => false)) return call(name, args, signal);
    return { text: `The Spotnote server on port ${PORT} stopped answering.`, isError: true };
  }
}

try {
  await becomeOwner();
} catch (e) {
  if (e.code !== "EADDRINUSE" || !(await isSpotnote())) {
    log(`port ${PORT} is taken by something else. Set SPOTNOTE_PORT to a free port (and the same in your dev server's env).`);
    process.exit(1);
  }
  log(`relaying to the Spotnote server on ${BASE}`);
  // Take over the port as soon as the owner exits, so browsers reconnect.
  const timer = setInterval(async () => {
    if (!owner && !(await isSpotnote())) await becomeOwner().catch(() => {});
    if (owner) clearInterval(timer);
  }, 3000);
}

const mcp = new McpServer({ name: "spotnote", version: "0.0.0" }, { instructions: INSTRUCTIONS });
registerTools(mcp, call);
const transport = new StdioServerTransport();
// The agent session ended: save, and free the port for the next owner.
const exit = () => {
  owner?.store.flush();
  process.exit(0);
};
transport.onclose = exit;
process.stdin.on("close", exit);
await mcp.connect(transport);
