// MCP server on the Vite dev server, so a local coding agent can read the notes
// written in the browser, talk back on them, and mark them done — no copy and
// paste per note.
//
//   claude mcp add --transport http spotnote http://localhost:5173/__spotnote/mcp
//
// The browser stays the source of truth: it sends its notes (with each note's
// thread) over Vite's HMR socket whenever they change ("spotnote:notes"). What
// the agent says goes back the same way ("spotnote:agent") as thread messages;
// until a browser has applied one, it's kept here, so a closed tab catches up
// and the agent sees its own words. Each browser (one localStorage, so all its
// tabs) has its own list; the agent sees them all.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export const MCP_PATH = "/__spotnote/mcp";
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BATCH_MS = 3000; // after a note arrives, wait this long for more before answering watch_notes
// Claude Code drops an HTTP tool call that sends nothing for 60s, so a watch
// always answers before that; the agent just calls again.
const MAX_WAIT_S = 50;

const INSTRUCTIONS =
  "Spotnote notes are requests the developer writes on UI elements of their running app, in the browser. Each note " +
  "names the exact source file, line and column. To work through them hands-free, call watch_notes in a loop: handle " +
  "what it returns, then call it again. A wait that ends with nothing is normal: keep watching until the developer " +
  "tells you to stop. The developer is looking at the browser, not at this chat: ask questions " +
  "with reply_note (they answer in the browser and the answer comes back through watch_notes), and finish each note " +
  "with resolve_note.";

const valid = (n) => n && typeof n.key === "string" && typeof n.note === "string" && (n.thread === undefined || Array.isArray(n.thread));

export function mountMcp(server) {
  const browsers = new Map(); // browser id -> its last list of notes
  const pending = []; // agent messages no browser has applied yet: { key, note, msg }
  const delivered = new Set(); // what watch_notes already handed out (see signature)
  const waiters = new Set(); // watch_notes calls waiting for a change

  // A browser's note with the agent's not-yet-applied messages on top.
  function view(n) {
    let { thread = [], done = false } = n;
    for (const p of pending) {
      if (p.key !== n.key || p.note !== n.note || thread.some((m) => m.id === p.msg.id)) continue;
      thread = [...thread, p.msg];
      if (p.msg.resolves) done = true;
    }
    return { ...n, thread, done: !!done };
  }
  const notes = () => [...browsers].flatMap(([browser, list]) => list.map((n) => view({ ...n, browser })));
  // Open, and the agent hasn't had the last word.
  const needsAgent = (v) => !v.done && v.thread.at(-1)?.from !== "agent";
  const signature = (v) => `${v.browser}\n${v.key}\n${v.note}\n${v.thread.length}`;

  server.ws.on("spotnote:notes", (data, client) => {
    // A throw here would take the whole dev server down, so ignore anything
    // malformed (e.g. a tab still running an older client).
    const list = data?.notes;
    if (typeof data?.browser !== "string" || !Array.isArray(list) || !list.every(valid)) return;
    browsers.set(data.browser, list);
    // Drop messages a browser has applied, or whose note was deleted or rewritten.
    const all = [...browsers.values()].flat();
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      const owners = all.filter((n) => n.key === p.key && n.note === p.note);
      if (!owners.length || owners.some((n) => n.thread?.some((m) => m.id === p.msg.id))) pending.splice(i, 1);
    }
    // A tab that missed messages catches up when it syncs.
    const missed = pending.filter((p) => list.some((n) => n.key === p.key && n.note === p.note));
    if (missed.length) client.send("spotnote:agent", missed);
    for (const wake of waiters) wake();
  });

  function say(note, msg) {
    msg = { id: Math.random().toString(36).slice(2), from: "agent", at: Date.now(), ...msg };
    pending.push({ key: note.key, note: note.note, msg });
    server.ws.send("spotnote:agent", [pending.at(-1)]);
  }

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

  function createServer() {
    const mcp = new McpServer({ name: "spotnote", version: "0.0.0" }, { instructions: INSTRUCTIONS });
    const find = (id) => notes().find((v) => v.key === id);
    const unknown = (id) => ({ ...text(`No note with id ${id}. Call list_notes for the current ids.`), isError: true });
    const noPage = () => text("No page has connected yet. Open the app in a browser while the dev server runs, then try again.");

    mcp.registerTool(
      "watch_notes",
      {
        description:
          "Wait for notes that need you: new notes, and developer replies on notes you asked about or resolved. Returns " +
          "them in a batch, or nothing after the timeout. Call it again after handling each batch to keep working " +
          "hands-free.",
        inputSchema: {
          timeout_seconds: z.number().int().min(1).max(MAX_WAIT_S).optional().describe(`How long to wait. Default and max ${MAX_WAIT_S}.`),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ timeout_seconds = MAX_WAIT_S }, extra) => {
        // The batch window comes on top, so keep the total under the limit.
        const end = Date.now() + Math.min(timeout_seconds * 1000, MAX_WAIT_S * 1000);
        const fresh = () => notes().filter((v) => needsAgent(v) && !delivered.has(signature(v)));
        while (!fresh().length && Date.now() < end && !extra.signal?.aborted) await change(end - Date.now(), extra.signal);
        if (!fresh().length) return text(browsers.size ? "No new notes yet. Call watch_notes again to keep waiting." : noPage().content[0].text);
        // Give the developer a moment to finish a few notes, so they come as one batch.
        const batchEnd = Date.now() + BATCH_MS;
        while (Date.now() < batchEnd && !extra.signal?.aborted) await change(batchEnd - Date.now(), extra.signal);
        const batch = fresh();
        batch.forEach((v) => delivered.add(signature(v)));
        return text(batch.map(format).join("\n\n---\n\n"));
      },
    );
    mcp.registerTool(
      "list_notes",
      {
        description:
          "List all open notes, including ones watch_notes already returned. Each note's prompt names the exact source " +
          "file, line and column of the element.",
        annotations: { readOnlyHint: true },
      },
      () => {
        if (!browsers.size) return noPage();
        const open = notes().filter((v) => !v.done);
        return text(open.length ? open.map(format).join("\n\n---\n\n") : "No open notes.");
      },
    );
    mcp.registerTool(
      "reply_note",
      {
        description:
          "Write to the developer on a note: a question when the request is unclear, or why you won't make the change. " +
          "They see it on the note in the browser; their answer comes back through watch_notes.",
        inputSchema: {
          id: z.string().describe("The note's id."),
          message: z.string().describe("What to tell or ask the developer. Short and plain."),
        },
      },
      ({ id, message }) => {
        const note = find(id);
        if (!note) return unknown(id);
        say(note, { text: message });
        return text(`Sent to the developer on note ${note.n}.`);
      },
    );
    mcp.registerTool(
      "resolve_note",
      {
        description:
          "Mark a note done after you've made the change. The developer sees a check mark on its pin and your summary " +
          "on the note. If they reply that it isn't right, the note comes back through watch_notes.",
        inputSchema: {
          id: z.string().describe("The note's id."),
          summary: z.string().describe("One or two sentences: what you changed, and in which file."),
        },
      },
      ({ id, summary }) => {
        const note = find(id);
        if (!note) return unknown(id);
        say(note, { text: summary, resolves: true });
        return text(`Marked note ${note.n} done.`);
      },
    );
    return mcp;
  }

  // Stateless: a fresh server + transport per request.
  server.middlewares.use(MCP_PATH, async (req, res) => {
    // Only this machine: not the LAN under `vite --host`, nor a web page that
    // rebinds its own hostname to 127.0.0.1.
    if (!isLocal(req)) {
      res.statusCode = 403;
      return res.end("Forbidden");
    }
    const mcp = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close();
      mcp.close();
    });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      // Never let a bad request reject unhandled: that would stop the dev server.
      server.config.logger.error(`[spotnote] MCP request failed: ${err.message}`);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    }
  });
}

function isLocal(req) {
  const host = (req.headers.host || "").replace(/:\d+$/, "");
  let origin = null;
  try {
    origin = req.headers.origin && new URL(req.headers.origin).hostname;
  } catch {
    return false; // "null" or garbage
  }
  return LOOPBACK.has(req.socket.remoteAddress) && LOCAL_HOSTS.has(host) && (!origin || LOCAL_HOSTS.has(origin));
}

// A note for the agent: its prompt, then the conversation on it so far.
function format(v) {
  const who = (m) => (m.from === "agent" ? (m.resolves ? "you (resolved)" : "you") : "developer");
  const convo = v.thread.length ? `\n\n## Conversation\n${v.thread.map((m) => `- ${who(m)}: ${m.text}`).join("\n")}` : "";
  return `### Note ${v.n} (id: ${v.key})\npage: ${v.url}\n\n${v.prompt}${convo}`;
}

const text = (t) => ({ content: [{ type: "text", text: t }] });
