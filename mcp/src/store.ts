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
import type { App, BrowserNote, Message, Note, Target } from "./types.ts";

const HOME = process.env.SPOTNOTE_HOME || path.join(homedir(), ".spotnote");
const DIR = path.join(HOME, "apps");

const id = () => Math.random().toString(36).slice(2);
// The agent session working on a note, if any.
const holder = (n: Note) => (n.working ? n.working.agent : null);
const fileOf = (root: string) => path.join(DIR, createHash("sha1").update(root).digest("hex").slice(0, 16) + ".json");

export type Store = ReturnType<typeof createStore>;

export function createStore() {
  const apps = new Map<string, App>(); // root -> its notes
  const listeners = new Set<(root: string) => void>(); // after every change
  const versions = new Map<string, number>(); // root -> change count, so browsers can drop out-of-order snapshots

  // Load what earlier runs saved, so the agent sees notes before a page opens.
  mkdirSync(DIR, { recursive: true });
  for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    try {
      // Files from before deletions were kept have no `deleted`.
      const app: Omit<App, "deleted"> & { deleted?: App["deleted"] } = JSON.parse(
        readFileSync(path.join(DIR, f), "utf8"),
      );
      if (typeof app.root !== "string" || !Array.isArray(app.notes)) continue;
      for (const n of app.notes) n.working = false; // whoever had them is gone
      apps.set(app.root, { ...app, deleted: app.deleted ?? {} });
    } catch {
      /* a corrupt file just starts empty */
    }
  }

  function app(root: string): App {
    let a = apps.get(root);
    if (!a) apps.set(root, (a = { root, notes: [], deleted: {} }));
    return a;
  }

  const timers = new Map<string, NodeJS.Timeout>(); // root -> pending save
  function save(root: string) {
    clearTimeout(timers.get(root));
    timers.delete(root);
    const file = fileOf(root);
    const { notes, ...rest } = app(root);
    writeFileSync(file + ".tmp", JSON.stringify({ ...rest, notes: notes.map(({ working, ...n }) => n) }));
    renameSync(file + ".tmp", file); // atomic: a crash never leaves half a file
  }
  function changed(root: string) {
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
  const fromBrowser = (n: BrowserNote) => ({
    key: n.key,
    loc: n.loc,
    index: Number(n.index) || 0,
    more: Array.isArray(n.more)
      ? n.more
          .filter((t): t is Target => typeof t?.loc === "string")
          .map((t) => ({ loc: t.loc, index: Number(t.index) || 0 }))
      : [],
    url: String(n.url ?? ""),
    note: n.note,
    prompt: String(n.prompt ?? ""),
  });

  return {
    flush: () => [...timers.keys()].forEach(save), // before exiting
    apps: () => [...apps.values()],
    notes: (root: string) => app(root).notes,
    snapshot: (root: string) => ({ v: versions.get(root) ?? 0, notes: app(root).notes }),
    onChange(cb: (root: string) => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    // ── From the browser ──
    upsert(root: string, n: BrowserNote) {
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
    remove(root: string, key: string) {
      const a = app(root);
      a.notes = a.notes.filter((x) => x.key !== key);
      a.deleted[key] = Date.now(); // so a stale browser can't bring it back
      changed(root);
    },
    reply(root: string, key: string, text: string) {
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
    merge(root: string, list: BrowserNote[]) {
      const a = app(root);
      let any = false;
      for (const n of list) {
        const updated = Number(n.updated) || 0;
        if ((a.deleted[n.key] ?? -1) >= updated) continue;
        const i = a.notes.findIndex((x) => x.key === n.key);
        if (i >= 0 && a.notes[i].updated >= updated) continue;
        const thread: Message[] = Array.isArray(n.thread) ? n.thread : [];
        const asked = Number(n.asked) || updated;
        const note: Note = {
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
    say(root: string, key: string, msg: Pick<Message, "text" | "resolves" | "dismisses" | "client">) {
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
    working(root: string, keys: string[], agent: string, client?: string | null) {
      const fresh = app(root).notes.filter((n) => keys.includes(n.key) && holder(n) !== agent);
      if (!fresh.length) return;
      for (const n of fresh) n.working = { agent, client: client ?? null };
      changed(root);
    },
    // The agent moved on without answering these: it's not working on them any
    // more, and a note a reply reopened goes back to how it was.
    release(agent: string) {
      for (const a of apps.values()) {
        const held = a.notes.filter((n) => holder(n) === agent);
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
