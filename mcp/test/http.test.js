// The owner's HTTP server on a free port: who may call what, the browser's
// edits and snapshots, and a relay's tool calls.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const home = mkdtempSync(path.join(tmpdir(), "spotnote-test-"));
process.env.SPOTNOTE_HOME = home; // read when store.js loads
const { createStore } = await import("../src/store.ts");
const { createHttpServer } = await import("../src/http.ts");

const root = path.join(home, "app");
const PAGE = "http://localhost:5173";
const note = { key: "a.jsx:1:1@0", loc: "a.jsx:1:1", index: 0, url: "/", note: "Bigger", prompt: "## Request\nBigger" };

let store,
  server,
  port,
  handovers = 0;
const tools = [];
before(async () => {
  store = createStore();
  const runTool = async (...a) => (tools.push(a), { text: `ran ${a[0]}` });
  server = createHttpServer(store, runTool, { code: { version: "test" }, onHandover: () => handovers++ });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});
after(() => {
  server.close();
  store.flush();
  rmSync(home, { recursive: true, force: true });
});

// `origin` set: a call from a page. `host`: to fake a foreign Host header.
function call(method, url, { origin, host, body } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { host: host ?? `127.0.0.1:${port}`, ...(origin && { origin }) };
    if (body !== undefined) headers["content-type"] = "application/json";
    const req = http.request({ port, method, path: url, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.on("error", reject);
    req.end(body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body));
  });
}
const op = (body) => call("POST", "/op", { origin: PAGE, body });

test("/health says it's a Spotnote server, with its code", async () => {
  const r = await call("GET", "/health");
  assert.deepEqual(JSON.parse(r.data), { spotnote: 1, version: "test" });
});

test("only this machine: a foreign Host or a page on another site is refused", async () => {
  assert.equal((await call("GET", "/health", { host: "evil.example" })).status, 403); // DNS rebinding
  assert.equal((await call("GET", "/health", { origin: "https://evil.example" })).status, 403);
  assert.equal((await call("GET", "/health", { origin: "not a url" })).status, 403);
  assert.equal((await call("GET", "/nope")).status, 404);
});

test("a page's preflight, and its origin echoed back", async () => {
  const r = await call("OPTIONS", "/op", { origin: PAGE });
  assert.equal(r.status, 204);
  assert.equal(r.headers["access-control-allow-origin"], PAGE);
  assert.match(r.headers["access-control-allow-methods"], /POST/);
});

test("/op: a page's edits, answered with the new snapshot", async () => {
  let r = await op({ root, op: "upsert", note });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.data).notes[0].note, "Bigger");

  r = await op({ root, op: "reply", key: note.key, text: "And bluer" });
  assert.equal(JSON.parse(r.data).notes[0].thread[0].text, "And bluer");

  r = await op({ root, op: "merge", notes: [{ ...note, key: "b.jsx:2:2@0", updated: Date.now() }] });
  assert.equal(JSON.parse(r.data).notes.length, 2);

  r = await op({ root, op: "remove", key: "b.jsx:2:2@0" });
  assert.equal(JSON.parse(r.data).notes.length, 1);
});

test("/op refuses what isn't a valid edit, and any call not from a page", async () => {
  for (const body of [
    { op: "upsert", note }, // no root
    { root, op: "upsert", note: { key: "x" } },
    { root, op: "merge", notes: [{ key: "x" }] },
    { root, op: "explode" },
    "{not json",
  ])
    assert.equal((await op(body)).status, 400, JSON.stringify(body));
  assert.equal((await call("POST", "/op", { body: { root, op: "remove", key: note.key } })).status, 404);
  assert.equal(store.notes(root).length, 1);
});

test("/op refuses a body over 1MB", async () => {
  const r = await op({ root, op: "reply", key: note.key, text: "x".repeat(1 << 20) }).catch(() => ({
    status: "closed",
  }));
  assert.notEqual(r.status, 200);
  assert.equal(store.notes(root)[0].thread.length, 1);
});

test("/events: a snapshot at once, then one on every change to that app", async () => {
  assert.equal((await call("GET", "/events", { origin: PAGE })).status, 400); // no root
  const events = [];
  const req = http.request({
    port,
    path: `/events?root=${encodeURIComponent(root)}`,
    headers: { host: `127.0.0.1:${port}`, origin: PAGE },
  });
  let wake = () => {};
  req.on("response", (res) =>
    res.on("data", (c) => {
      events.push(...(String(c).match(/^data: .*$/gm) ?? []));
      wake();
    }),
  );
  const got = (count) =>
    new Promise((resolve) => {
      wake = () => events.length >= count && resolve();
      wake();
    });
  req.end();
  await got(1);
  store.upsert(path.join(home, "other"), note); // another app: not sent
  store.reply(root, note.key, "Thanks");
  await got(2);
  req.destroy();
  const [first, second] = events.map((e) => JSON.parse(e.slice(6)));
  assert.equal(second.v, first.v + 1);
  assert.equal(second.notes[0].thread.at(-1).text, "Thanks");
});

test("/rpc runs a relay's tool call; never from a page", async () => {
  const body = { tool: "list_notes", args: {}, cwd: home, agent: "agent-2", client: "codex" };
  const r = await call("POST", "/rpc", { body });
  assert.deepEqual(JSON.parse(r.data), { text: "ran list_notes" });
  const [name, args, cwd, signal, agent, client] = tools.at(-1);
  assert.deepEqual([name, args, cwd, agent, client], ["list_notes", {}, home, "agent-2", "codex"]);
  assert.ok(signal instanceof AbortSignal);
  assert.equal((await call("POST", "/rpc", { origin: PAGE, body })).status, 404);
});

test("/handover hands the port over after replying; never from a page", async () => {
  assert.equal((await call("POST", "/handover", { origin: PAGE })).status, 404);
  assert.equal((await call("POST", "/handover")).status, 204);
  await new Promise(setImmediate);
  assert.equal(handovers, 1);
});
