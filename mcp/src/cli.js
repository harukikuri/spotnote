#!/usr/bin/env node
// spotnote-mcp — Spotnote's MCP server. The agent starts it (stdio):
//
//   claude mcp add spotnote -- npx -y spotnote-mcp
//
// Browsers reach it on 127.0.0.1:4848 (SPOTNOTE_PORT). Every agent session
// starts its own copy, but only one can own the port: that one keeps the notes
// (see store.js), and the others relay their agent's tool calls to it. When the
// owner exits, a relay takes over the port. When a copy with newer code starts
// (Spotnote was updated while an old session still runs), the old owner hands
// the port over and relays instead.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createStore } from "./store.js";
import { createRunner, registerTools, INSTRUCTIONS } from "./tools.js";
import { createHttpServer } from "./http.js";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.SPOTNOTE_PORT) || 4848;
const BASE = `http://127.0.0.1:${PORT}`;
const cwd = process.cwd(); // the agent's project: it only sees notes from apps in here
const agent = Math.random().toString(36).slice(2); // this agent session, for "working" (see store.js)
const log = (msg) => console.error(`[spotnote-mcp] ${msg}`); // stdout is the MCP channel

// This copy's code: a hash of its source, and when that source last changed.
const CODE = (() => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .sort();
  const hash = createHash("sha1");
  let time = 0;
  for (const f of files) {
    hash.update(readFileSync(path.join(dir, f)));
    time = Math.max(time, statSync(path.join(dir, f)).mtimeMs);
  }
  return { build: hash.digest("hex").slice(0, 12), time };
})();

let owner = null; // { store, runTool, server } once this process owns the port

async function becomeOwner() {
  const store = createStore();
  const runTool = createRunner(store);
  const server = createHttpServer(store, runTool, { code: CODE, onHandover: handOver });
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(PORT, "127.0.0.1", ok);
  });
  owner = { store, runTool, server };
  log(`serving browsers on ${BASE} (build ${CODE.build})`);
}

// A newer copy asked for the port: save, close it, and relay to the newcomer.
function handOver() {
  if (!owner) return;
  const { store, server } = owner;
  owner = null;
  store.flush();
  server.close();
  server.closeAllConnections(); // browsers' event streams too; they reconnect to the new owner
  log("handed the port to a newer copy; relaying");
  watchOwner();
}

// The owner's /health: { spotnote: 1, build, time }, or null if it's not ours.
async function ownerInfo() {
  try {
    const h = await (await fetch(`${BASE}/health`)).json();
    return h.spotnote === 1 ? h : null;
  } catch {
    return null;
  }
}

// Relaying: take over the port as soon as the owner exits, so browsers reconnect.
function watchOwner() {
  const timer = setInterval(async () => {
    if (!owner && !(await ownerInfo())) await becomeOwner().catch(() => {});
    if (owner) clearInterval(timer);
  }, 3000);
}

// Ask an owner running older code to hand over, then take the port.
async function takeFromOlder(info) {
  if (info.build === CODE.build || !(info.time < CODE.time)) return false;
  await fetch(`${BASE}/handover`, { method: "POST" }).catch(() => {});
  for (let i = 0; i < 20 && !owner; i++) {
    await new Promise((r) => setTimeout(r, 150));
    await becomeOwner().catch(() => {});
  }
  if (owner) log(`took over from an older copy (build ${info.build ?? "?"})`);
  return !!owner;
}

// Which coding agent this is, as it named itself when connecting ("claude-code"):
// kept on its messages, so the note panel can show its mark.
const client = () => mcp.server.getClientVersion()?.name ?? null;

async function call(name, args, signal) {
  if (owner) return owner.runTool(name, args, cwd, signal, agent, client());
  try {
    const res = await fetch(`${BASE}/rpc`, {
      method: "POST",
      body: JSON.stringify({ tool: name, args, cwd, agent, client: client() }),
      signal,
    });
    return await res.json();
  } catch {
    if (signal?.aborted) return { text: "Cancelled." };
    // The owner went away mid-call: take its place and run the call here.
    if (
      await becomeOwner().then(
        () => true,
        () => false,
      )
    )
      return call(name, args, signal);
    return { text: `The Spotnote server on port ${PORT} stopped answering.`, isError: true };
  }
}

try {
  await becomeOwner();
} catch (e) {
  const info = e.code === "EADDRINUSE" && (await ownerInfo());
  if (!info) {
    log(
      `port ${PORT} is taken by something else. Set SPOTNOTE_PORT to a free port (and the same in your dev server's env).`,
    );
    process.exit(1);
  }
  if (!(await takeFromOlder(info))) {
    log(`relaying to the Spotnote server on ${BASE}`);
    watchOwner();
  }
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
