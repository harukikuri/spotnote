// The notes, per app (one Vite root), saved under ~/.spotnote so they outlive
// the dev server, node_modules and the browser tab. While this server runs it
// is the source of truth; browsers mirror it and fall back to localStorage
// when it's gone.
//
// A note: { key, loc, index, more, url, note, prompt, thread, done, dismissed, working, asked, updated }
//   key       "path:line:col@index" — of the element the note was written on
//   more      [{ loc, index }]: the other elements it's on (added with Shift-click)
//   asked     when this request was written, in ms: a note deleted and written again
//             word for word is still a new request
//   thread    [{ id, from: "agent" | "you", text, at, resolves?, dismisses?, client? }]
//             (client: the agent's name for itself, e.g. "claude-code")
//   done      the agent made the change; dismissed: it won't, and said why
//   working   { agent, client } of the agent that has it — its session id and its name
//             for itself ("claude-code") — or false (set when a tool hands it out; not saved)
//   reopened  "done" / "dismissed": what a reply reopened, to restore if the agent
//             lets it go without answering (a "thanks!" needs no change)
//   updated   last change, in ms (newer wins when a browser brings offline notes)
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const HOME = process.env.SPOTNOTE_HOME || path.join(homedir(), ".spotnote");
const DIR = path.join(HOME, "apps");

const id = () => Math.random().toString(36).slice(2);
const fileOf = (root) => path.join(DIR, createHash("sha1").update(root).digest("hex").slice(0, 16) + ".json");

export function createStore() {
  const apps = new Map(); // root -> { root, notes: [], deleted: { key: ms } }
  const listeners = new Set(); // (root) => void, after every change
  const versions = new Map(); // root -> change count, so browsers can drop out-of-order snapshots

  // Load what earlier runs saved, so the agent sees notes before a page opens.
  mkdirSync(DIR, { recursive: true });
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    try {
      const app = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
      if (typeof app.root !== "string" || !Array.isArray(app.notes)) continue;
      app.notes.forEach((n) => (n.working = false)); // whoever had them is gone
      apps.set(app.root, { deleted: {}, ...app });
    } catch {
      /* a corrupt file just starts empty */
    }
  }

  function app(root) {
    if (!apps.has(root)) apps.set(root, { root, notes: [], deleted: {} });
    return apps.get(root);
  }

  const timers = new Map(); // root -> pending save
  function save(root) {
    clearTimeout(timers.get(root));
    timers.delete(root);
    const file = fileOf(root);
    const { notes, ...rest } = apps.get(root);
    writeFileSync(file + ".tmp", JSON.stringify({ ...rest, notes: notes.map(({ working, ...n }) => n) }));
    renameSync(file + ".tmp", file); // atomic: a crash never leaves half a file
  }
  function changed(root) {
    versions.set(root, (versions.get(root) ?? 0) + 1);
    // Save shortly after, and tell the browsers and watchers now.
    clearTimeout(timers.get(root));
    timers.set(
      root,
      setTimeout(() => save(root), 200),
    );
    for (const cb of listeners) cb(root);
  }

  // What the browser sends: everything it knows about a note except the thread.
  const fromBrowser = (n) => ({
    key: n.key,
    loc: n.loc,
    index: n.index,
    more: Array.isArray(n.more)
      ? n.more.filter((t) => typeof t?.loc === "string").map((t) => ({ loc: t.loc, index: Number(t.index) || 0 }))
      : [],
    url: n.url,
    note: n.note,
    prompt: n.prompt,
  });

  return {
    flush: () => [...timers.keys()].forEach(save), // before exiting
    apps: () => [...apps.values()],
    notes: (root) => app(root).notes,
    snapshot: (root) => ({ v: versions.get(root) ?? 0, notes: app(root).notes }),
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    // ── From the browser ──
    upsert(root, n) {
      const a = app(root);
      const old = a.notes.find((x) => x.key === n.key);
      if (!old) {
        const now = Date.now();
        a.notes.push({
          ...fromBrowser(n),
          thread: [],
          done: false,
          dismissed: false,
          working: false,
          asked: now,
          updated: now,
        });
        delete a.deleted[n.key];
      } else {
        // A rewritten note is a new request: start its conversation over.
        if (old.note !== n.note)
          Object.assign(old, {
            thread: [],
            done: false,
            dismissed: false,
            working: false,
            reopened: null,
            asked: Date.now(),
          });
        Object.assign(old, fromBrowser(n), { updated: Date.now() });
      }
      changed(root);
    },
    remove(root, key) {
      const a = app(root);
      a.notes = a.notes.filter((x) => x.key !== key);
      a.deleted[key] = Date.now(); // so a stale browser can't bring it back
      changed(root);
    },
    reply(root, key, text) {
      const n = app(root).notes.find((x) => x.key === key);
      if (!n) return;
      n.thread.push({ id: id(), from: "you", text, at: Date.now() });
      // Replying reopens a done or dismissed note, for the agent to pick up again.
      n.reopened = n.done ? "done" : n.dismissed ? "dismissed" : n.reopened;
      Object.assign(n, { done: false, dismissed: false, working: false });
      n.updated = Date.now();
      changed(root);
    },
    // Notes a browser kept while this server wasn't running: the newer copy of
    // each note wins, the other is dropped.
    merge(root, list) {
      const a = app(root);
      let any = false;
      for (const n of list) {
        const updated = Number(n.updated) || 0;
        if ((a.deleted[n.key] ?? -1) >= updated) continue;
        const i = a.notes.findIndex((x) => x.key === n.key);
        if (i >= 0 && a.notes[i].updated >= updated) continue;
        const thread = Array.isArray(n.thread) ? n.thread : [];
        const asked = Number(n.asked) || updated;
        const note = {
          ...fromBrowser(n),
          thread,
          done: !!n.done,
          dismissed: !!n.dismissed,
          working: false,
          asked,
          updated,
        };
        if (i >= 0) a.notes[i] = note;
        else a.notes.push(note);
        any = true;
      }
      if (any) changed(root);
    },

    // ── From the agent ──
    say(root, key, msg) {
      const n = app(root).notes.find((x) => x.key === key);
      if (!n) return false;
      n.thread.push({ id: id(), from: "agent", at: Date.now(), ...msg });
      if (msg.resolves) n.done = true;
      if (msg.dismisses) n.dismissed = true;
      n.working = false; // it answered: the ball is with the developer
      n.reopened = null;
      n.updated = Date.now();
      changed(root);
      return true;
    },
    // An agent was handed these notes (see tools.js).
    working(root, keys, agent, client) {
      const fresh = app(root).notes.filter((n) => keys.includes(n.key) && n.working?.agent !== agent);
      if (!fresh.length) return;
      fresh.forEach((n) => (n.working = { agent, client: client ?? null }));
      changed(root);
    },
    // The agent moved on without answering these: it's not working on them any
    // more, and a note a reply reopened goes back to how it was.
    release(agent) {
      for (const a of apps.values()) {
        const held = a.notes.filter((n) => n.working?.agent === agent);
        if (!held.length) continue;
        for (const n of held) {
          n.working = false;
          if (n.reopened) n[n.reopened] = true;
          n.reopened = null;
        }
        changed(a.root);
      }
    },
  };
}
