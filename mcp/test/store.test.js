// The notes store and the agent's tools, against a throwaway SPOTNOTE_HOME.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const home = mkdtempSync(path.join(tmpdir(), "spotnote-test-"));
process.env.SPOTNOTE_HOME = home; // read when store.js loads
const { createStore } = await import("../src/store.js");
const { createRunner } = await import("../src/tools.js");

const root = path.join(home, "app");
const note = (key, text, extra = {}) => ({
  key,
  loc: key.split("@")[0],
  index: 0,
  url: "/",
  note: text,
  prompt: `## Request\n${text}`,
  ...extra,
});

let store;
before(() => (store = createStore()));
after(() => {
  store.flush();
  rmSync(home, { recursive: true, force: true });
});

test("upsert adds a note; rewriting it starts its conversation over", () => {
  store.upsert(root, note("a.jsx:1:1@0", "Bigger"));
  store.say(root, "a.jsx:1:1@0", { text: "Done", resolves: true });
  assert.equal(store.notes(root)[0].done, true);
  store.upsert(root, note("a.jsx:1:1@0", "Smaller"));
  const n = store.notes(root)[0];
  assert.deepEqual([n.note, n.done, n.thread.length], ["Smaller", false, 0]);
});

test("a reply reopens a done note", () => {
  store.say(root, "a.jsx:1:1@0", { text: "Done", resolves: true });
  store.reply(root, "a.jsx:1:1@0", "One more thing");
  const n = store.notes(root)[0];
  assert.equal(n.done, false);
  assert.equal(n.thread.at(-1).from, "you");
});

test("merge keeps the newer copy and can't revive a deleted note", () => {
  store.upsert(root, note("b.jsx:2:2@0", "Server copy"));
  const server = store.notes(root).find((n) => n.key === "b.jsx:2:2@0");
  store.merge(root, [note("b.jsx:2:2@0", "Older copy", { updated: server.updated - 1 })]);
  assert.equal(store.notes(root).find((n) => n.key === "b.jsx:2:2@0").note, "Server copy");

  store.remove(root, "b.jsx:2:2@0");
  store.merge(root, [note("b.jsx:2:2@0", "Stale browser", { updated: 1 })]);
  assert.equal(
    store.notes(root).some((n) => n.key === "b.jsx:2:2@0"),
    false,
  );
});

test("tools: list_notes, then reply / resolve by id", async () => {
  const run = createRunner(store);
  const cwd = home; // the agent works in a folder above the app
  const listed = await run("list_notes", {}, cwd, undefined, "agent-1", "claude-code");
  assert.match(listed.text, /One more thing|Smaller/);
  const id = `app:a.jsx:1:1@0`;
  assert.equal(store.notes(root)[0].working.client, "claude-code"); // handed out

  assert.match((await run("reply_note", { id, message: "Which one?" }, cwd)).text, /Sent to the developer/);
  assert.equal(store.notes(root)[0].working, false); // it answered

  assert.match((await run("resolve_note", { id, summary: "Made it smaller" }, cwd)).text, /done/);
  assert.equal(store.notes(root)[0].done, true);

  const missing = await run("resolve_note", { id: "app:nope@0", summary: "x" }, cwd);
  assert.equal(missing.isError, true);
});

test("tools: an agent only sees apps inside or around the folder it works in", async () => {
  const run = createRunner(store);
  const elsewhere = await run("list_notes", {}, path.join(tmpdir(), "somewhere-else"));
  assert.doesNotMatch(elsewhere.text, /Smaller/);
});
