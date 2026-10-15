// watch_notes (with mocked timers: it waits up to 50s, then 3s for a batch) and
// the MCP side of the tools, against a throwaway SPOTNOTE_HOME.
import { test, before, after, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const home = mkdtempSync(path.join(tmpdir(), "spotnote-test-"));
process.env.SPOTNOTE_HOME = home; // read when store.js loads
const { createStore } = await import("../src/store.js");
const { createRunner, registerTools } = await import("../src/tools.js");

let n = 0;
let store, run, cwd, root;
const note = (key, text) => ({
  key,
  loc: key.split("@")[0],
  index: 0,
  url: "/",
  note: text,
  prompt: `## Request\n${text}`,
});
const watch = (args = {}, signal) => run("watch_notes", args, cwd, signal, "agent-1", "claude-code");
// Let watch_notes run up to its next wait, then move the clock past it.
const tick = async (ms) => {
  await new Promise(setImmediate);
  mock.timers.tick(ms);
};

before(() => (store = createStore()));
beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });
  run = createRunner(store); // each test its own agent session
  cwd = path.join(home, `agent${++n}`); // its own folder, with one app in it
  root = path.join(cwd, "app");
});
afterEach(() => mock.timers.reset());
after(() => {
  store.flush();
  rmSync(home, { recursive: true, force: true });
});

test("watch_notes answers 'nothing yet' when the wait ends", async () => {
  const p = watch({ timeout_seconds: 1 });
  await tick(1000);
  assert.match((await p).text, /No new notes yet/);
});

test("watch_notes wakes on a new note, waits for the batch, and hands it out", async () => {
  const p = watch();
  await tick(10);
  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  store.upsert(root, note("b.jsx:2:2@0", "Bluer")); // within the batch window
  await tick(3000);
  const { text } = await p;
  assert.match(text, /### Note 1 \(id: app:a\.jsx:1:1@0\)/);
  assert.match(text, /app: app\/ \(the file path below is relative to it\)/);
  assert.match(text, /Bigger[\s\S]*---[\s\S]*Bluer/);
  assert.deepEqual(store.notes(root)[0].working, { agent: "agent-1", client: "claude-code" });
});

test("watch_notes doesn't hand out the same note twice, but does a developer reply", async () => {
  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  let p = watch();
  await tick(3000);
  assert.match((await p).text, /Bigger/);
  await run("resolve_note", { id: "app:a.jsx:1:1@0", summary: "Made it bigger" }, cwd);

  p = watch({ timeout_seconds: 1 });
  await tick(1000);
  assert.match((await p).text, /No new notes yet/); // resolved: nothing for the agent

  store.reply(root, "a.jsx:1:1@0", "A bit more");
  p = watch();
  await tick(3000);
  const { text } = await p;
  assert.match(text, /## Conversation\n- you \(resolved\): Made it bigger\n- developer: A bit more/);
});

test("watching again lets go of notes the last batch left unanswered", async () => {
  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  store.say(root, "a.jsx:1:1@0", { text: "Done", resolves: true });
  store.reply(root, "a.jsx:1:1@0", "Thanks!");
  let p = watch();
  await tick(3000);
  assert.match((await p).text, /Thanks!/);

  p = watch({ timeout_seconds: 1 }); // moved on without answering the "thanks"
  const [v] = store.notes(root);
  assert.deepEqual([v.working, v.done], [false, true]); // back to done
  await tick(1000);
  await p;
});

test("watch_notes hands out again a note no agent holds that it never answered", async () => {
  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  let p = watch();
  await tick(3000);
  await p;
  store.release("agent-1"); // e.g. the agent's answer never arrived
  p = watch();
  await tick(3000);
  assert.match((await p).text, /Bigger/);
});

test("a cancelled watch_notes returns at once", async () => {
  const abort = new AbortController();
  const p = watch({}, abort.signal);
  await new Promise(setImmediate);
  abort.abort();
  assert.match((await p).text, /No new notes yet/);
});

test("list_notes: no notes, no open notes, and an unknown tool", async () => {
  const fresh = createRunner(store);
  const nowhere = path.join(tmpdir(), "spotnote-nowhere");
  assert.match((await fresh("list_notes", {}, nowhere)).text, /No notes yet/);

  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  await fresh("dismiss_note", { id: "app:a.jsx:1:1@0", reason: "Out of scope" }, cwd);
  assert.equal(store.notes(root)[0].dismissed, true);
  assert.equal((await fresh("list_notes", {}, cwd)).text, "No open notes.");

  assert.equal((await fresh("nope", {}, cwd)).isError, true);
});

test("registerTools: each tool goes through `call`, with or without arguments", async () => {
  const handlers = {};
  const mcp = { registerTool: (name, config, handler) => (handlers[name] = { config, handler }) };
  const calls = [];
  registerTools(mcp, async (name, args, signal) => {
    calls.push([name, args, signal]);
    return name === "reply_note" ? { text: "bad", isError: true } : { text: "ok" };
  });
  assert.deepEqual(Object.keys(handlers), ["watch_notes", "list_notes", "reply_note", "dismiss_note", "resolve_note"]);

  const signal = new AbortController().signal;
  assert.deepEqual(await handlers.list_notes.handler({ signal }), {
    content: [{ type: "text", text: "ok" }],
    isError: false,
  });
  const r = await handlers.reply_note.handler({ id: "x", message: "?" }, { signal });
  assert.equal(r.isError, true);
  assert.deepEqual(calls, [
    ["list_notes", {}, signal],
    ["reply_note", { id: "x", message: "?" }, signal],
  ]);
});
