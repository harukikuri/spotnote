// The agent's tools. `runTool` does the work against the store (in the server
// that owns it); `registerTools` exposes them over MCP through any `call`, so a
// relay server can forward them to the owner instead (see cli.js).
import path from "node:path";
import { z } from "zod";

const BATCH_MS = 3000; // after a note arrives, wait this long for more before answering watch_notes
// Claude Code drops an MCP tool call that sends nothing for 60s, so a watch
// always answers before that; the agent just calls again.
const MAX_WAIT_S = 50;

export const INSTRUCTIONS =
  "Spotnote notes are requests the developer writes on UI elements of their running app, in the browser. Each note " +
  "names the exact source file, line and column. To work through them hands-free, call watch_notes in a loop: handle " +
  "what it returns, then call it again. A wait that ends with nothing is normal: keep watching until the developer " +
  "tells you to stop. The developer is looking at the browser, not at this chat: ask questions with reply_note (they " +
  "answer in the browser and the answer comes back through watch_notes). End every note you get with resolve_note, " +
  "dismiss_note or reply_note, even when there's nothing to change: if the developer only says thanks or confirms, " +
  "call resolve_note with a short summary like \"Nothing to change.\"";

// An app is the agent's business when it's inside the agent's folder (or the
// agent works inside the app). Its notes' ids carry the app's path from there,
// since two apps can have a note on the same "src/App.jsx:…".
function inScope(root, cwd) {
  return root === cwd || root.startsWith(cwd + path.sep) || cwd.startsWith(root + path.sep);
}

export function createRunner(store) {
  const delivered = new Set(); // what watch_notes already handed out (see signature)
  const waiters = new Set();
  store.onChange(() => waiters.forEach((wake) => wake()));

  function notes(cwd) {
    return store
      .apps()
      .filter((a) => inScope(a.root, cwd))
      .flatMap((a) => {
        const app = path.relative(cwd, a.root) || ".";
        return a.notes.map((n, i) => ({ ...n, root: a.root, app, id: `${app}:${n.key}`, n: i + 1 }));
      });
  }
  const open = (v) => !v.done && !v.dismissed;
  // Open, and the agent hasn't had the last word.
  const needsAgent = (v) => open(v) && v.thread.at(-1)?.from !== "agent";
  // Show the developer an agent has these, until it replies, resolves or dismisses.
  function handOut(list, agent) {
    for (const root of new Set(list.map((v) => v.root)))
      store.working(root, list.filter((v) => v.root === root).map((v) => v.key), agent);
  }
  const signature = (v) => `${v.root}\n${v.key}\n${v.note}\n${v.thread.length}`;

  // Resolves once something changes, after `ms`, or when the call is cancelled.
  function change(ms, signal) {
    return new Promise((done) => {
      const finish = () => {
        clearTimeout(timer);
        waiters.delete(finish);
        signal?.removeEventListener("abort", finish);
        done();
      };
      const timer = setTimeout(finish, ms);
      waiters.add(finish);
      signal?.addEventListener("abort", finish);
    });
  }

  const ok = (text) => ({ text });
  const err = (text) => ({ text, isError: true });
  const unknown = (id) => err(`No note with id ${id}. Call list_notes for the current ids.`);
  const empty = "No notes yet. Write one in the browser: open the app with the Spotnote launcher and click an element.";

  const tools = {
    async watch_notes({ timeout_seconds = MAX_WAIT_S } = {}, cwd, signal, agent) {
      // Watching again means the last batch is handled; whatever it left unanswered
      // isn't being worked on (see store.release).
      store.release(agent);
      const end = Date.now() + Math.min(timeout_seconds, MAX_WAIT_S) * 1000;
      const fresh = () => notes(cwd).filter((v) => needsAgent(v) && !delivered.has(signature(v)));
      while (!fresh().length && Date.now() < end && !signal?.aborted) await change(end - Date.now(), signal);
      if (!fresh().length) return ok("No new notes yet. Call watch_notes again to keep waiting.");
      // Give the developer a moment to finish a few notes, so they come as one batch.
      const batchEnd = Date.now() + BATCH_MS;
      while (Date.now() < batchEnd && !signal?.aborted) await change(batchEnd - Date.now(), signal);
      const batch = fresh();
      batch.forEach((v) => delivered.add(signature(v)));
      handOut(batch, agent);
      return ok(batch.map(format).join("\n\n---\n\n"));
    },
    list_notes(_, cwd, signal, agent) {
      const all = notes(cwd);
      const list = all.filter(open);
      handOut(list.filter((v) => v.thread.at(-1)?.from !== "agent"), agent); // not the ones waiting on the developer
      return ok(list.length ? list.map(format).join("\n\n---\n\n") : all.length ? "No open notes." : empty);
    },
    reply_note({ id, message }, cwd) {
      const v = notes(cwd).find((x) => x.id === id);
      if (!v || !store.say(v.root, v.key, { text: message })) return unknown(id);
      return ok(`Sent to the developer on note ${v.n}.`);
    },
    dismiss_note({ id, reason }, cwd) {
      const v = notes(cwd).find((x) => x.id === id);
      if (!v || !store.say(v.root, v.key, { text: reason, dismisses: true })) return unknown(id);
      return ok(`Dismissed note ${v.n}.`);
    },
    resolve_note({ id, summary }, cwd) {
      const v = notes(cwd).find((x) => x.id === id);
      if (!v || !store.say(v.root, v.key, { text: summary, resolves: true })) return unknown(id);
      return ok(`Marked note ${v.n} done.`);
    },
  };

  // `agent` tells agent sessions apart (each spotnote-mcp process has its own id).
  return async function runTool(name, args, cwd, signal, agent) {
    if (!tools[name]) return err(`Unknown tool ${name}.`);
    return tools[name](args ?? {}, cwd, signal, agent);
  };
}

// `call(name, args, signal)` → { text, isError? }
export function registerTools(mcp, call) {
  const tool = (name, config) =>
    // A tool without an inputSchema gets only `extra`.
    mcp.registerTool(name, config, async (...params) => {
      const [args, extra] = config.inputSchema ? params : [{}, params[0]];
      const r = await call(name, args, extra.signal);
      return { content: [{ type: "text", text: r.text }], isError: !!r.isError };
    });
  tool("watch_notes", {
    description:
      "Wait for notes that need you: new notes, and developer replies on notes you asked about or resolved. Returns " +
      "them in a batch, or nothing after the timeout. Answer each note it returns with resolve_note, dismiss_note or " +
      "reply_note (resolve it if nothing needs changing), then call it again to keep working hands-free.",
    inputSchema: {
      timeout_seconds: z.number().int().min(1).max(MAX_WAIT_S).optional().describe(`How long to wait. Default and max ${MAX_WAIT_S}.`),
    },
    annotations: { readOnlyHint: true },
  });
  tool("list_notes", {
    description:
      "List all open notes, including ones watch_notes already returned. Each note's prompt names the exact source " +
      "file, line and column of the element.",
    annotations: { readOnlyHint: true },
  });
  tool("reply_note", {
    description:
      "Write to the developer on a note: a question when the request is unclear, or why you won't make the change. " +
      "They see it on the note in the browser; their answer comes back through watch_notes.",
    inputSchema: {
      id: z.string().describe("The note's id."),
      message: z.string().describe("What to tell or ask the developer. Short and plain."),
    },
  });
  tool("dismiss_note", {
    description:
      "Close a note without making the change, when you shouldn't or can't (it's out of scope, already done, or would " +
      "break something). The developer sees your reason; if they reply, the note comes back through watch_notes. " +
      "To ask something instead, use reply_note.",
    inputSchema: {
      id: z.string().describe("The note's id."),
      reason: z.string().describe("Why you won't make the change. One or two sentences."),
    },
  });
  tool("resolve_note", {
    description:
      "Mark a note done after you've made the change. The developer sees a check mark on its pin and your summary on " +
      "the note. If they reply that it isn't right, the note comes back through watch_notes.",
    inputSchema: {
      id: z.string().describe("The note's id."),
      summary: z.string().describe("One or two sentences: what you changed, and in which file."),
    },
  });
}

// A note for the agent: where its app is, its prompt, then the conversation so far.
function format(v) {
  const who = (m) => (m.from === "agent" ? (m.resolves ? "you (resolved)" : m.dismisses ? "you (dismissed)" : "you") : "developer");
  const convo = v.thread.length ? `\n\n## Conversation\n${v.thread.map((m) => `- ${who(m)}: ${m.text}`).join("\n")}` : "";
  const app = v.app === "." ? "" : `app: ${v.app}/ (the file path below is relative to it)\n`;
  return `### Note ${v.n} (id: ${v.id})\n${app}page: ${v.url}\n\n${v.prompt}${convo}`;
}
