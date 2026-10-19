// The plugin's other Vite hooks: the injected client, telling pages whether
// spotnote-mcp is up, and opening a file the agent mentioned in your editor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A fake spotnote-mcp on a free port, set before the plugin reads SPOTNOTE_PORT.
const mcp = http.createServer((_, res) => res.end(JSON.stringify({ spotnote: 1 })));
await new Promise((r) => mcp.listen(0, "127.0.0.1", r));
process.env.SPOTNOTE_PORT = String(mcp.address().port);
const { default: spotnote } = await import("../src/index.js");

const repo = path.resolve(fileURLToPath(import.meta.url), "../../..");
const root = path.join(repo, "examples/react/react19");

function plugin(plugins = []) {
  const [p] = spotnote();
  p.configResolved({ root, plugins });
  return p;
}

// A dev server just big enough for configureServer.
function devServer() {
  const s = { sent: [], handlers: {}, closers: [], warnings: [] };
  s.ws = { send: (event, data) => s.sent.push([event, data]), on: (event, fn) => (s.handlers[event] = fn) };
  s.httpServer = { on: (_, fn) => s.closers.push(fn) };
  s.middlewares = { use: (_, fn) => (s.open = fn) };
  s.config = { logger: { warn: (m) => s.warnings.push(m) } };
  return s;
}
let server;
before(() => {
  server = devServer();
  plugin().configureServer(server);
});
after(() => {
  server.closers.forEach((fn) => fn());
  mcp.close();
});

// GET /__spotnote/open?… → { status, body }
function open(query) {
  return new Promise((resolve) => {
    const res = {
      setHeader() {},
      end: (body) => resolve({ status: res.statusCode, body: JSON.parse(body) }),
    };
    server.open({ url: `/?${new URLSearchParams(query)}` }, res);
  });
}
async function withEditor(editor, fn) {
  const before = process.env.LAUNCH_EDITOR;
  process.env.LAUNCH_EDITOR = editor;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.LAUNCH_EDITOR;
    else process.env.LAUNCH_EDITOR = before;
  }
}

test("the browser's component files import the client, which boots the picker with the app's framework", () => {
  const [, client] = spotnote();
  const transform = (id, ssr) => client.transform("code", id, { ssr })?.code;
  for (const file of ["App.jsx", "App.tsx", "App.vue", "App.svelte"])
    assert.equal(transform(`/app/src/${file}`), 'code\nimport "virtual:spotnote-client";');
  assert.equal(transform("/app/src/App.svelte", true), undefined); // the server's copy
  assert.equal(transform("/app/src/App.vue?vue&type=style&index=0&lang.css"), undefined);
  assert.equal(transform("/app/src/util.js"), undefined);
  assert.equal(transform("/app/node_modules/lib/Button.jsx"), undefined);

  const p = plugin([{ name: "vite:react-babel" }]);
  const id = p.resolveId("virtual:spotnote-client");
  assert.equal(p.resolveId("other"), undefined);
  assert.match(p.load(id), /initInspector\(\{"jsx":"react","root":".*react19"/);
  assert.equal(p.load("other"), undefined);
  assert.match(plugin([{ name: "solid" }]).load(id), /"jsx":"solid"/);
  assert.match(plugin([{ name: "vite:react-swc" }, { name: "solid" }]).load(id), /"jsx":null/); // can't tell
});

test("port: the page and the spotnote-mcp check use the port option over SPOTNOTE_PORT", async () => {
  const other = http.createServer((_, res) => res.end(JSON.stringify({ spotnote: 1 })));
  await new Promise((r) => other.listen(0, "127.0.0.1", r));
  const port = other.address().port;
  const [p] = spotnote({ port });
  p.configResolved({ root, plugins: [] });
  const s = devServer();
  try {
    assert.match(p.load(p.resolveId("virtual:spotnote-client")), new RegExp(`"port":${port}`));
    p.configureServer(s);
    for (let i = 0; i < 50 && !s.sent.length; i++) await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(s.sent, [["spotnote:mcp", { up: true }]]); // heard from the server on that port
  } finally {
    s.closers.forEach((fn) => fn());
    other.close();
  }
});

test("runs on the dev server only: not in builds, nor under Vitest", () => {
  const [{ apply }] = spotnote();
  assert.equal(apply({}, { command: "serve" }), true);
  assert.equal(apply({}, { command: "build" }), false);
  process.env.VITEST = "true";
  try {
    assert.equal(apply({}, { command: "serve" }), false);
  } finally {
    delete process.env.VITEST;
  }
});

test("build: also runs in builds in those modes, and gives the page the commit they're made from", () => {
  const [main, client] = spotnote({ build: ["staging", "preview"] });
  assert.equal(main.apply({}, { command: "build", mode: "staging" }), true);
  assert.equal(client.apply({}, { command: "build", mode: "preview" }), true);
  assert.equal(main.apply({}, { command: "build", mode: "production" }), false);
  assert.equal(main.apply({}, { command: "serve", mode: "development" }), true);

  const load = (command) => {
    const [p] = spotnote({ build: ["staging"] });
    p.configResolved({ root, plugins: [], command });
    return p.load(p.resolveId("virtual:spotnote-client"));
  };
  assert.match(load("build"), /"root":"","port":\d+,.*"commit":"[0-9a-f]{7}"/); // no path from the machine that built it
  assert.match(load("serve"), /"commit":null/); // the dev server serves your checkout itself
});

test("pages hear whether spotnote-mcp is up, and can ask", async () => {
  for (let i = 0; i < 50 && !server.sent.length; i++) await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(server.sent, [["spotnote:mcp", { up: true }]]);
  const replies = [];
  server.handlers["spotnote:mcp?"](null, { send: (...a) => replies.push(a) });
  assert.deepEqual(replies, [["spotnote:mcp", { up: true }]]);
});

test("open: finds the file from the app root, then the repository root", async () => {
  assert.deepEqual(await open({ path: "vite.config.js", resolve: 1 }), {
    status: 200,
    body: { file: path.join(root, "vite.config.js") },
  });
  assert.deepEqual(await open({ path: "package/src/index.js", resolve: 1 }), {
    status: 200,
    body: { file: path.join(repo, "package/src/index.js") },
  });
});

test("open: nothing outside the repository, and no folders or missing files", async () => {
  for (const p of ["../../../../etc/hosts", "nope.js", "react", ""])
    assert.deepEqual(await open({ path: p, resolve: 1 }), { status: 404, body: { error: "missing" } }, p);
});

test("open: a terminal editor or an unknown one that isn't installed is 'no editor'", async () => {
  for (const editor of ["vim", "/not/installed/notepad"])
    await withEditor(editor, async () =>
      assert.deepEqual(await open({ path: "vite.config.js" }), { status: 409, body: { error: "no-editor" } }),
    );
});

test("open: VS Code & co. without their CLI open through their URL scheme", async () => {
  await withEditor("/not/installed/code", async () =>
    assert.deepEqual(await open({ path: "vite.config.js" }), {
      status: 200,
      body: { file: path.join(root, "vite.config.js"), scheme: "vscode" },
    }),
  );
});

test("open: an installed editor is launched at the line", { skip: !existsSync("/usr/bin/true") }, async () => {
  await withEditor("/usr/bin/true", async () => {
    const r = await open({ path: "vite.config.js", line: 3, column: 1 });
    assert.deepEqual(r, { status: 200, body: { file: path.join(root, "vite.config.js"), editor: "true" } });
  });
});
