// spotnote-mcp as the agent starts it: real processes on a free port, against a
// throwaway SPOTNOTE_HOME. Who owns the port, who relays, and who takes over.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const cli = path.resolve(fileURLToPath(import.meta.url), "../../src/cli.js");
const home = mkdtempSync(path.join(tmpdir(), "spotnote-test-"));
after(() => rmSync(home, { recursive: true, force: true }));

async function freePort() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}
const env = (port) => ({ ...process.env, SPOTNOTE_PORT: String(port), SPOTNOTE_HOME: home });

// Waits until `read()` (the log so far) matches.
async function until(read, re, ms = 10000) {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 20)))
    if (re.test(read())) return;
  assert.fail(`no ${re} in:\n${read()}`);
}

// One agent session: spotnote-mcp started over stdio, as `claude mcp add` does.
async function agent(port) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli],
    env: env(port),
    cwd: home,
    stderr: "pipe",
  });
  let log = "";
  transport.stderr.on("data", (d) => (log += d));
  const client = new Client({ name: "test-agent", version: "1" });
  await client.connect(transport);
  return {
    log: () => log,
    waitFor: (re, ms) => until(() => log, re, ms),
    listNotes: async () => (await client.callTool({ name: "list_notes", arguments: {} })).content[0].text,
    close: () => client.close(),
  };
}

const health = (port) =>
  fetch(`http://127.0.0.1:${port}/health`).then(
    (r) => r.json(),
    () => null,
  );
const NO_NOTES = /^No notes yet/;

test("the first session owns the port, the next relays to it, and takes over when it exits", async () => {
  const port = await freePort();
  const a = await agent(port);
  await a.waitFor(/serving browsers on .* \(build \w+\)/);
  assert.equal((await health(port)).spotnote, 1);

  const b = await agent(port);
  await b.waitFor(/relaying to the Spotnote server/);
  assert.match(await b.listNotes(), NO_NOTES); // through the owner's /rpc

  await a.close();
  await b.waitFor(/serving browsers/, 6000); // within one 3s check
  assert.match(await b.listNotes(), NO_NOTES);
  await b.close();
});

test("a relay whose owner just went away runs the call itself", async () => {
  const port = await freePort();
  const a = await agent(port);
  await a.waitFor(/serving browsers/);
  const b = await agent(port);
  await b.waitFor(/relaying/);

  await a.close();
  while (await health(port)) await new Promise((r) => setTimeout(r, 10));
  assert.match(await b.listNotes(), NO_NOTES);
  await b.waitFor(/serving browsers/);
  await b.close();
});

test("the owner hands the port over when a newer copy asks, then takes it back once it's free", async () => {
  const port = await freePort();
  const a = await agent(port);
  await a.waitFor(/serving browsers/);
  await fetch(`http://127.0.0.1:${port}/handover`, { method: "POST" });
  await a.waitFor(/handed the port to a newer copy; relaying/);
  await a.waitFor(/handed the port[\s\S]*serving browsers/, 6000); // nobody took it
  await a.close();
});

test("an owner running older code is asked for the port", async () => {
  const port = await freePort();
  const old = http.createServer((req, res) => {
    if (req.url === "/health") return res.end(JSON.stringify({ spotnote: 1, build: "old", time: 0 }));
    res.end("{}");
    if (req.url === "/handover") old.close(), old.closeAllConnections();
  });
  await new Promise((r) => old.listen(port, "127.0.0.1", r));

  const a = await agent(port);
  await a.waitFor(/took over from an older copy \(build old\)/);
  assert.match(await a.listNotes(), NO_NOTES);
  await a.close();
});

test("a port taken by something else: says so, and exits", async () => {
  const port = await freePort();
  const other = http.createServer((_, res) => res.end("not spotnote"));
  await new Promise((r) => other.listen(port, "127.0.0.1", r));

  const p = spawn(process.execPath, [cli], { env: env(port), cwd: home });
  let log = "";
  p.stderr.on("data", (d) => (log += d));
  const code = await new Promise((r) => p.on("exit", r));
  other.close();
  assert.equal(code, 1);
  assert.match(log, new RegExp(`port ${port} is taken by something else. Set SPOTNOTE_PORT`));
});
