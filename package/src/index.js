// Spotnote — a self-contained Vite plugin. Add it once and it:
//   1. stamps `data-spotnote="file:line:col"` on host JSX elements (dev only),
//   2. auto-injects the browser picker client into the page.
// No manual Babel wiring, no client import in your entry.
//
//   import spotnote from "spotnote";
//   export default defineConfig({ plugins: [react(), spotnote()] });
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import MagicString from "magic-string";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
// For the Settings footer: "Spotnote v0.0.0" and a link to the repository.
const ABOUT = { version: pkg.version, repo: pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "") };
const launchEditor = require("launch-editor");
const guessEditor = require("launch-editor/guess.js");
// What launch-editor falls back to without a GUI editor: it would open inside
// the dev server's terminal, where it can't run. Better to say "no editor".
const TERMINAL_EDITORS = new Set(["vi", "vim", "nvim", "nano", "emacs", "pico", "ed", "micro", "hx", "helix"]);
// Editors that also open from a URL: used when their command-line tool isn't
// installed (VS Code's `code` often isn't), so the page opens the URL instead.
const EDITOR_SCHEMES = {
  code: "vscode",
  "code-insiders": "vscode-insiders",
  cursor: "cursor",
  windsurf: "windsurf",
  zed: "zed",
};

// Can `cmd` be run? (An absolute path that exists, or a name found on PATH.)
function runnable(cmd) {
  if (path.isAbsolute(cmd)) return existsSync(cmd);
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  return (process.env.PATH || "")
    .split(path.delimiter)
    .some((dir) => exts.some((ext) => existsSync(path.join(dir, cmd + ext))));
}
const babelVisitor = require("./plugin.cjs"); // the JSX-stamping Babel plugin
const clientEntry = fileURLToPath(new URL("./client/inspector.js", import.meta.url));

const VIRTUAL = "virtual:spotnote-client";
const MCP_PORT = Number(process.env.SPOTNOTE_PORT) || 4848; // spotnote-mcp's port (see mcp/)
const RESOLVED = "\0" + VIRTUAL;

const warnedParse = new Set(); // files we couldn't parse (warn once each)

// Vue SFCs aren't JSX, so Babel can't reach them. Instead we parse the SFC with
// the app's own `vue/compiler-sfc` and splice `data-spotnote` onto each native
// template element. Resolved lazily from the project so the plugin keeps no Vue
// dependency of its own (undefined = not tried yet, null = unavailable).
let vueParse;
async function getVueParse(root) {
  if (vueParse !== undefined) return vueParse;
  try {
    const projectRequire = createRequire(path.join(root, "index.js"));
    const sfcUrl = pathToFileURL(projectRequire.resolve("vue/compiler-sfc"));
    ({ parse: vueParse } = await import(sfcUrl.href));
  } catch {
    vueParse = null; // no Vue in this project — silently skip .vue stamping
  }
  return vueParse;
}

// Walk the template AST and stamp every native host element (tagType 0). Element
// `loc.start.offset` is absolute in the SFC source, so we splice back-to-front
// (offsets stay valid) and only insert within a line (line numbers preserved).
function stampVueTemplate(code, file, root, parse) {
  const { descriptor, errors } = parse(code, { filename: file });
  if (errors.length || !descriptor.template || !descriptor.template.ast) return;
  const rel = path.relative(root, file) || file;
  // The SFC's component name ≈ its filename (Vue/devtools convention).
  const name = path.basename(file, path.extname(file));
  const s = new MagicString(code);
  let touched = false;
  const visit = (node) => {
    if (!node) return;
    // NodeTypes.ELEMENT === 1, ElementTypes.ELEMENT === 0 (a real DOM tag).
    if (node.type === 1 && node.tagType === 0 && node.tag && node.loc) {
      const already = (node.props || []).some((p) => p.type === 6 && p.name === "data-spotnote");
      if (!already) {
        const { offset, line, column } = node.loc.start;
        const pos = offset + 1 + node.tag.length; // just past "<tag"
        // Vue's line and column are already 1-based, like the other stamps.
        s.appendLeft(pos, ` data-spotnote="${rel}:${line}:${column}" data-spotnote-name="${name}"`);
        touched = true;
      }
    }
    (node.children || []).forEach(visit);
  };
  visit(descriptor.template.ast);
  if (!touched) return;
  // MagicString gives us a real source map (columns stay correct); back-to-front
  // splicing is no longer needed since appendLeft tracks offsets itself.
  return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
}

// Svelte, like Vue, isn't JSX — parse with the app's own `svelte/compiler` and
// splice `data-spotnote` onto native markup elements. Resolved lazily from the
// project (undefined = not tried yet, null = unavailable).
let svelteParse;
async function getSvelteParse(root) {
  if (svelteParse !== undefined) return svelteParse;
  try {
    const projectRequire = createRequire(path.join(root, "index.js"));
    const url = pathToFileURL(projectRequire.resolve("svelte/compiler"));
    const m = await import(url.href);
    // svelte/compiler is CJS — importing the file by path exposes `parse` on the
    // interop default, not as a named export.
    svelteParse = m.parse || m.default?.parse || null;
  } catch {
    svelteParse = null; // no Svelte in this project — silently skip .svelte stamping
  }
  return svelteParse;
}

// Offset → { line, column }, both 1-based like the JSX/Vue stamps.
function offsetToLineCol(code, offset) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

// Generic tree walk over the parsed markup (we don't care about node kinds
// except native elements).
function walkSvelte(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walkSvelte(n, visit);
    return;
  }
  if (typeof node.type === "string") visit(node);
  for (const key in node) {
    if (key === "parent") continue;
    walkSvelte(node[key], visit);
  }
}

function stampSvelte(code, file, root, parse) {
  let ast;
  try {
    ast = parse(code, { filename: file, modern: true });
  } catch {
    return; // let vite-plugin-svelte report the real parse error
  }
  const rel = path.relative(root, file).replace(/\\/g, "/") || file;
  const name = path.basename(file, path.extname(file));
  const s = new MagicString(code);
  let touched = false;
  // The markup root: `fragment` in Svelte 5's modern AST, `html` in Svelte 4's
  // (which ignores `modern`). Walking only it skips the <script>/<style> ASTs.
  // A native DOM tag is a RegularElement in Svelte 5 and an Element in Svelte 4;
  // components and <svelte:*> are other node types (in Svelte 4, <svelte:element>
  // is an Element named "svelte:element") → skipped.
  const markup = ast.fragment ?? ast.html;
  const isTag = ast.fragment
    ? (n) => n.type === "RegularElement"
    : (n) => n.type === "Element" && !n.name.includes(":");
  walkSvelte(markup, (node) => {
    if (!node.name || !isTag(node)) return;
    if (typeof node.start !== "number") return;
    const already = (node.attributes || []).some((a) => a && a.name === "data-spotnote");
    if (already) return;
    const { line, column } = offsetToLineCol(code, node.start);
    s.appendLeft(
      node.start + 1 + node.name.length,
      ` data-spotnote="${rel}:${line}:${column}" data-spotnote-name="${name}"`,
    );
    touched = true;
  });
  if (!touched) return;
  return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
}

// Which framework compiles .jsx/.tsx here, from the plugins in the config —
// the extension alone can't tell React from Solid. null = none or both.
function jsxFramework(plugins) {
  const names = plugins.map((p) => p.name || "");
  const react = names.some((n) => n.startsWith("vite:react"));
  const solid = names.includes("solid");
  return react === solid ? null : react ? "react" : "solid";
}

// The Git repository's root around `dir`, or `dir` itself outside one.
function repoRoot(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (existsSync(path.join(d, ".git"))) return d;
    if (path.dirname(d) === d) return dir;
  }
}

export default function spotnote() {
  let transformSync;
  let root = process.cwd();
  let jsx = null;
  return {
    name: "spotnote",
    // Dev only: production builds are untouched. Not under Vitest either, which
    // runs a dev server too: stamps would change tests' DOM and snapshots, and
    // the spotnote-mcp check would keep the test run from exiting.
    apply: (_, { command }) => command === "serve" && !process.env.VITEST,
    enforce: "pre", // stamp before the framework compiler processes the JSX

    configResolved(config) {
      root = config.root; // so stamped paths are relative to the app root
      jsx = jsxFramework(config.plugins);
    },
    // Tell pages whether spotnote-mcp is running, so they connect to it only
    // then: a page retrying a closed port would fill its console with errors.
    configureServer(server) {
      let up = false;
      const check = async () => {
        const now = await fetch(`http://127.0.0.1:${MCP_PORT}/health`)
          .then((r) => r.json())
          .then(
            (j) => j.spotnote === 1,
            () => false,
          );
        if (now !== up) server.ws.send("spotnote:mcp", { up: (up = now) });
      };
      const timer = setInterval(check, 2000);
      check();
      server.ws.on("spotnote:mcp?", (_, client) => client.send("spotnote:mcp", { up }));
      server.httpServer?.on("close", () => clearInterval(timer));

      // Open a file the agent mentioned ("router.jsx:28", "src/App.jsx") in your
      // editor. It's looked up against the Vite root, then the repository root
      // (agents often work from there); only files inside the repository.
      //   ?path=&line=&column=           open it in the running GUI editor
      //   ?path=&resolve=1               just return its absolute path (the page
      //                                  then opens it through vscode:// & co.)
      // → 200 { file, editor? } · 200 { file, scheme } (the running editor's CLI
      //   isn't installed: the page opens scheme://file/…) · 404 { error: "missing" }
      //   · 409 { error: "no-editor" }
      const top = repoRoot(root);
      server.middlewares.use("/__spotnote/open", (req, res) => {
        const q = new URL(req.url, "http://x").searchParams;
        const reply = (status, body) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        const file = [root, top]
          .map((base) => path.resolve(base, q.get("path") || ""))
          .find((f) => (f === top || f.startsWith(top + path.sep)) && existsSync(f) && statSync(f).isFile());
        if (!file) return reply(404, { error: "missing" });
        if (q.get("resolve")) return reply(200, { file });
        const [editor] = guessEditor();
        if (!editor || TERMINAL_EDITORS.has(path.basename(editor))) return reply(409, { error: "no-editor" });
        if (!runnable(editor)) {
          const scheme = EDITOR_SCHEMES[path.basename(editor)];
          return scheme ? reply(200, { file, scheme }) : reply(409, { error: "no-editor" });
        }
        const at = [file, q.get("line"), q.get("column")].filter(Boolean).join(":");
        launchEditor(
          at,
          editor,
          (_, err) => err && server.config.logger.warn(`[spotnote] couldn't open ${at}: ${err}`),
        );
        reply(200, { file, editor: path.basename(editor) });
      });
    },
    async buildStart() {
      ({ transformSync } = await import("@babel/core"));
    },

    // Virtual module that boots the picker.
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
    },
    load(id) {
      if (id === RESOLVED) {
        return `import { initInspector } from ${JSON.stringify(clientEntry)};\ninitInspector(${JSON.stringify({ jsx, root, port: MCP_PORT, about: ABOUT })});`;
      }
    },

    // Stamp host elements with their source location. order:"pre" runs this
    // hook ahead of every plugin without one — including other enforce:"pre"
    // compilers (Svelte, Solid) — so plugins-array order never matters.
    transform: {
      order: "pre",
      async handler(code, id) {
        if (id.includes("node_modules")) return;
        const file = id.split("?")[0];

        if (/\.(jsx|tsx)$/.test(file)) {
          let res;
          try {
            res = transformSync(code, {
              filename: file,
              root,
              plugins: [babelVisitor],
              // Parse permissively so common app syntax (decorators, import
              // attributes, `using`) doesn't trip our standalone pass.
              parserOpts: {
                plugins: ["jsx", "typescript", "decorators-legacy", "importAttributes", "explicitResourceManagement"],
              },
              configFile: false,
              babelrc: false,
              sourceMaps: true,
            });
          } catch {
            // Couldn't parse (syntax our config doesn't enable) — hand the file to
            // the framework's own compiler unstamped instead of erroring.
            if (!warnedParse.has(file)) {
              warnedParse.add(file);
              console.warn(
                `[spotnote] skipped ${path.relative(root, file)} — couldn't parse it, so its elements won't be pickable.`,
              );
            }
            return;
          }
          if (!res || res.code == null) return;
          return { code: res.code, map: res.map };
        }

        // Only the raw SFC import — skip the ?vue&type= sub-requests that the
        // Vue plugin derives from our already-stamped code.
        if (file.endsWith(".vue") && !id.includes("?")) {
          const parse = await getVueParse(root);
          if (!parse) return;
          return stampVueTemplate(code, file, root, parse);
        }

        // Raw .svelte import only — skip the ?svelte&type= sub-requests.
        if (file.endsWith(".svelte") && !id.includes("?")) {
          const parse = await getSvelteParse(root);
          if (!parse) return;
          return stampSvelte(code, file, root, parse);
        }
      },
    },

    // Inject the client so the app doesn't have to import it.
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: `/@id/${VIRTUAL}` }, injectTo: "body" }];
    },
  };
}
