// MCP server on the Vite dev server, so a local coding agent can read the notes
// written in the browser and mark them done — no copy and paste per note.
//
//   claude mcp add --transport http spotnote http://localhost:5173/__spotnote/mcp
//
// The browser stays the source of truth: it sends its notes over Vite's HMR
// socket whenever they change ("spotnote:notes"), and gets told when the agent
// resolves one ("spotnote:resolve"). Each browser (one localStorage, so all its
// tabs) has its own list; the agent sees them all.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export const MCP_PATH = "/__spotnote/mcp";
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function mountMcp(server) {
  const browsers = new Map(); // browser id -> its last list of notes
  const allNotes = () => [...browsers.values()].flat();
  // key -> { note, summary }, for tabs that were closed at the time. Kept with
  // the note's text: if the developer rewrote it since, it's a new request.
  const resolved = new Map();

  server.ws.on("spotnote:notes", (data, client) => {
    // A throw here would take the whole dev server down, so ignore anything
    // malformed (e.g. a tab still running an older client).
    const list = data?.notes;
    if (typeof data?.browser !== "string" || !Array.isArray(list) || !list.every((n) => n && typeof n.key === "string")) return;
    browsers.set(data.browser, list);
    const byKey = new Map(allNotes().map((n) => [n.key, n]));
    for (const [key, r] of resolved) if (byKey.get(key)?.note !== r.note) resolved.delete(key);
    // A tab that missed a resolve catches up when it syncs.
    const missed = list.filter((n) => !n.done && resolved.has(n.key)).map((n) => ({ key: n.key, summary: resolved.get(n.key).summary }));
    if (missed.length) client.send("spotnote:resolve", missed);
  });

  function createServer() {
    const mcp = new McpServer({ name: "spotnote", version: "0.0.0" });
    mcp.registerTool(
      "list_notes",
      {
        description:
          "List the open notes the developer left on UI elements of the running app with Spotnote. Each note's prompt names " +
          "the exact source file, line and column of the element. Make the change, then call resolve_note with the note's id.",
        annotations: { readOnlyHint: true },
      },
      () => {
        if (!browsers.size) return text("No page has connected yet. Open the app in a browser while the dev server runs, then try again.");
        const open = allNotes().filter((n) => !n.done && !resolved.has(n.key));
        if (!open.length) return text("No open notes.");
        return text(open.map((n) => `### Note ${n.n} (id: ${n.key})\npage: ${n.url}\n\n${n.prompt}`).join("\n\n---\n\n"));
      },
    );
    mcp.registerTool(
      "resolve_note",
      {
        description:
          "Mark a note from list_notes as done after you've made the change. The developer sees a check mark on its pin " +
          "and your summary next to the note.",
        inputSchema: {
          id: z.string().describe("The note's id, as given by list_notes."),
          summary: z.string().describe("One or two sentences: what you changed, and in which file."),
        },
      },
      ({ id, summary }) => {
        const note = allNotes().find((n) => n.key === id);
        if (!note) return { ...text(`No note with id ${id}. Call list_notes for the current ids.`), isError: true };
        resolved.set(id, { note: note.note, summary });
        server.ws.send("spotnote:resolve", [{ key: id, summary }]);
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

const text = (t) => ({ content: [{ type: "text", text: t }] });
