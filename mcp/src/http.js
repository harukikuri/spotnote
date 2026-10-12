// The owner's HTTP server on 127.0.0.1, for three kinds of caller:
//   browsers   GET /events (snapshots over SSE), POST /op (their edits)
//   relays     POST /rpc — another spotnote-mcp forwarding its agent's tool calls
//   anyone     GET /health — "is a Spotnote server on this port?", and its code
//   relays     POST /handover — a copy with newer code wants the port (cli.js)
// Only this machine, by a localhost name; browser calls only from a page on
// localhost, and /rpc never from a page at all.
import http from "node:http";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const MAX_BODY = 1 << 20;

function localOrigin(origin) {
  try {
    const u = new URL(origin);
    return /^https?:$/.test(u.protocol) && LOCAL.test(u.host);
  } catch {
    return false;
  }
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > MAX_BODY) reject(new Error("too large")), req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

const str = (v) => typeof v === "string";
const validNote = (n) => n && str(n.key) && str(n.note) && str(n.loc);

export function createHttpServer(store, runTool, { code, onHandover }) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const fromPage = origin !== undefined;
    if (!LOCAL.test(req.headers.host || "") || (fromPage && !localOrigin(origin))) {
      res.writeHead(403).end();
      return;
    }
    if (fromPage) res.setHeader("Access-Control-Allow-Origin", origin);
    const url = new URL(req.url, "http://localhost");

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type" }).end();
      } else if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ spotnote: 1, ...code }));
      } else if (req.method === "GET" && url.pathname === "/events" && fromPage) {
        const root = url.searchParams.get("root");
        if (!root) return void res.writeHead(400).end();
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        const send = () => res.write(`event: snapshot\ndata: ${JSON.stringify(store.snapshot(root))}\n\n`);
        send();
        const off = store.onChange((r) => r === root && send());
        const ping = setInterval(() => res.write(": ping\n\n"), 25000);
        req.on("close", () => (off(), clearInterval(ping)));
      } else if (req.method === "POST" && url.pathname === "/op" && fromPage) {
        const op = await body(req);
        if (!str(op?.root)) return void res.writeHead(400).end();
        if (op.op === "upsert" && validNote(op.note)) store.upsert(op.root, op.note);
        else if (op.op === "remove" && str(op.key)) store.remove(op.root, op.key);
        else if (op.op === "reply" && str(op.key) && str(op.text)) store.reply(op.root, op.key, op.text);
        else if (op.op === "merge" && Array.isArray(op.notes) && op.notes.every(validNote)) store.merge(op.root, op.notes);
        else return void res.writeHead(400).end();
        // The result, so the page needn't wait for it on /events.
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(store.snapshot(op.root)));
      } else if (req.method === "POST" && url.pathname === "/handover" && !fromPage) {
        res.writeHead(204).end();
        setImmediate(onHandover); // after the reply has gone out
      } else if (req.method === "POST" && url.pathname === "/rpc" && !fromPage) {
        const { tool, args, cwd, agent, client } = await body(req);
        const abort = new AbortController();
        res.on("close", () => abort.abort()); // the relay's agent cancelled
        const r = await runTool(tool, args, cwd, abort.signal, agent, client);
        if (!res.writableEnded) res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(r));
      } else {
        res.writeHead(404).end();
      }
    } catch {
      if (!res.headersSent) res.writeHead(400);
      res.end();
    }
  });
}
