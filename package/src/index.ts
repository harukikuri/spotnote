// Spotnote — a self-contained Vite plugin. Add it once and it:
//   1. stamps `data-spotnote="file:line:col"` on host JSX elements (dev only,
//      and builds in a `build` mode),
//   2. auto-injects the browser picker client into the page.
// No manual Babel wiring, no client import in your entry.
//
//   import spotnote from "spotnote";
//   export default defineConfig({ plugins: [react(), spotnote()] });
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import type { BabelFileResult } from "@babel/core";
import launchEditor from "launch-editor";
import guessEditor from "launch-editor/guess.js";
import MagicString, { type SourceMap } from "magic-string";
import { createFilter, type FilterPattern, type Plugin } from "vite";
import babelVisitor, { type Use } from "./plugin.ts"; // the JSX-stamping Babel plugin

const require = createRequire(import.meta.url);
const pkg: { version: string; repository: { url: string } } = require("../package.json");
// For the Settings footer: "Spotnote v0.0.0" and a link to the repository.
const ABOUT = { version: pkg.version, repo: pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "") };
// What launch-editor falls back to without a GUI editor: it would open inside
// the dev server's terminal, where it can't run. Better to say "no editor".
const TERMINAL_EDITORS = new Set(["vi", "vim", "nvim", "nano", "emacs", "pico", "ed", "micro", "hx", "helix"]);
// Editors that also open from a URL: used when their command-line tool isn't
// installed (VS Code's `code` often isn't), so the page opens the URL instead.
const EDITOR_SCHEMES: Record<string, string> = {
  code: "vscode",
  "code-insiders": "vscode-insiders",
  cursor: "cursor",
  windsurf: "windsurf",
  zed: "zed",
};

// Can `cmd` be run? (An absolute path that exists, or a name found on PATH.)
function runnable(cmd: string): boolean {
  if (path.isAbsolute(cmd)) return existsSync(cmd);
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  return (process.env.PATH || "")
    .split(path.delimiter)
    .some((dir) => exts.some((ext) => existsSync(path.join(dir, cmd + ext))));
}
const clientEntry = fileURLToPath(new URL("./client/inspector.js", import.meta.url));

const VIRTUAL = "virtual:spotnote-client";
const RESOLVED = "\0" + VIRTUAL;

const warnedParse = new Set<string>(); // files we couldn't parse (warn once each)

// A file we couldn't parse goes to the framework's own compiler unstamped,
// which reports a real syntax error itself: say once why its elements can't
// be picked.
function skipped(file: string, root: string): undefined {
  if (warnedParse.has(file)) return;
  warnedParse.add(file);
  console.warn(
    `[spotnote] skipped ${path.relative(root, file)} — couldn't parse it, so its elements won't be pickable.`,
  );
}

// The compilers below come from the app's own dependencies, so the plugin keeps
// none of its own. Each is loaded lazily, once per app root (a test run stamps
// apps on different versions), and is null when the app doesn't have it: that
// file type then just isn't stamped.
function perRoot<T>(load: (root: string) => Promise<T>): (root: string) => Promise<T | null> {
  const cache = new Map<string, Promise<T | null>>();
  return (root) => {
    let got = cache.get(root);
    if (!got) cache.set(root, (got = load(root).catch(() => null)));
    return got;
  };
}
// The compilers' modules, untyped here: each reader below names the few
// fields it uses.
const appImport = async (root: string, pkg: string): Promise<Record<string, unknown>> =>
  import(pathToFileURL(createRequire(path.join(root, "index.js")).resolve(pkg)).href);

// What a stamper returns: the stamped code and its source map.
type Stamped = { code: string; map: SourceMap };

// Vue SFCs aren't JSX, so Babel can't reach them. Instead we parse the SFC with
// the app's own `vue/compiler-sfc` and splice `data-spotnote` onto each native
// template element.
type VueNode = {
  type: number;
  tagType?: number;
  tag?: string;
  loc?: { start: { offset: number; line: number; column: number } };
  props?: { type: number; name?: string }[];
  children?: VueNode[];
};
type VueParse = (
  code: string,
  options: { filename: string },
) => { descriptor: { template?: { ast?: VueNode } | null }; errors: unknown[] };
const getVueParse = perRoot(async (root) => (await appImport(root, "vue/compiler-sfc")).parse as VueParse);

// Walk the template AST and stamp every native host element (tagType 0). Element
// `loc.start.offset` is absolute in the SFC source, so we splice back-to-front
// (offsets stay valid) and only insert within a line (line numbers preserved).
function stampVueTemplate(code: string, file: string, base: string, parse: VueParse, used: Use[]): Stamped | undefined {
  const { descriptor, errors } = parse(code, { filename: file });
  if (errors.length) throw errors[0];
  if (!descriptor.template?.ast) return;
  const rel = path.relative(base, file).replace(/\\/g, "/") || file;
  // The SFC's component name ≈ its filename (Vue/devtools convention).
  const name = path.basename(file, path.extname(file));
  const s = new MagicString(code);
  let touched = false;
  const visit = (node: VueNode | undefined) => {
    if (!node) return;
    // NodeTypes.ELEMENT === 1, ElementTypes.ELEMENT === 0 (a real DOM tag).
    // ElementTypes.COMPONENT === 1: where a component is used (see plugin.ts).
    if (node.type === 1 && node.tagType === 1 && node.tag && node.loc)
      used.push([node.tag, node.loc.start.line, node.loc.start.column]);
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
// splice `data-spotnote` onto native markup elements.
type SvelteNode = { type: string; name?: string; start?: number; attributes?: ({ name?: string } | null)[] };
type SvelteParse = (
  code: string,
  options: { filename: string; modern: boolean },
) => { fragment?: unknown; html?: unknown };
const getSvelteParse = perRoot(async (root) => {
  const m = await appImport(root, "svelte/compiler");
  // svelte/compiler is CJS — importing the file by path exposes `parse` on the
  // interop default, not as a named export.
  return (m.parse || (m.default as { parse?: unknown } | undefined)?.parse || null) as SvelteParse | null;
});

// Offset → { line, column }, both 1-based like the JSX/Vue stamps.
function offsetToLineCol(code: string, offset: number): { line: number; column: number } {
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
// except native elements). N: the fields the caller reads off a node with a
// string `type`, as its parser makes them.
function walkAst<N>(node: unknown, visit: (node: N) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walkAst(n, visit);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.type === "string") visit(node as N);
  for (const key in record) {
    if (key === "parent") continue;
    walkAst(record[key], visit);
  }
}

function stampSvelte(code: string, file: string, base: string, parse: SvelteParse, used: Use[]): Stamped | undefined {
  // Svelte 4 reads <script> as JavaScript and <style> as CSS, so TypeScript or
  // SCSS there makes it throw. Only the markup is walked: parse a copy with
  // their contents blanked (same length and lines), and splice into the code.
  const markupOnly = code.replace(
    /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (_, open, _tag, body, close) => open + body.replace(/[^\n]/g, " ") + close,
  );
  const ast = parse(markupOnly, { filename: file, modern: true });
  // Braces in an attribute value are an expression in Svelte: write them as
  // character references, so a path like src/{x}/ stays text.
  const text = (v: string) => v.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
  const rel = text(path.relative(base, file).replace(/\\/g, "/") || file);
  const name = text(path.basename(file, path.extname(file)));
  const s = new MagicString(code);
  let touched = false;
  // The markup root: `fragment` in Svelte 5's modern AST, `html` in Svelte 4's
  // (which ignores `modern`). Walking only it skips the <script>/<style> ASTs.
  // A native DOM tag is a RegularElement in Svelte 5 and an Element in Svelte 4;
  // components and <svelte:*> are other node types (in Svelte 4, <svelte:element>
  // is an Element named "svelte:element") → skipped.
  const markup = ast.fragment ?? ast.html;
  const isTag = ast.fragment
    ? (n: SvelteNode) => n.type === "RegularElement"
    : (n: SvelteNode) => n.type === "Element" && !n.name?.includes(":");
  walkAst<SvelteNode>(markup, (node) => {
    if ((node.type === "Component" || node.type === "InlineComponent") && node.name && typeof node.start === "number") {
      const { line, column } = offsetToLineCol(code, node.start);
      used.push([node.name, line, column]); // where a component is used (see plugin.ts)
    }
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

// Astro, too: parse with the compiler of the app's own `astro` (the app may not
// depend on it directly) and splice `data-spotnote` onto native elements in the
// markup. Astro 7 has `@astrojs/compiler-rs`, Astro 5 and 6 `@astrojs/compiler`:
// each gives its own AST, so each gets a reader that lists the elements as
// { tag, start, stamped } (start: the offset of its "<" in the code).
type AstroElement = { tag: string; start: number; stamped: boolean };
type ElementsOf = (code: string) => Promise<AstroElement[]>;
const getAstroElements = perRoot(async (root): Promise<ElementsOf> => {
  const astroPkg = createRequire(path.join(root, "index.js")).resolve("astro/package.json");
  const astroRequire = createRequire(astroPkg);
  const load = async (pkg: string): Promise<unknown> =>
    (await import(pathToFileURL(astroRequire.resolve(pkg)).href)).parse;
  // The compiler this Astro declares: another one may be installed next to it.
  const astro: { dependencies?: Record<string, string> } = require(astroPkg);
  if (astro.dependencies?.["@astrojs/compiler-rs"]) {
    const parse = (await load("@astrojs/compiler-rs")) as (code: string) => { ast: unknown };
    return async (code) => rsElements(parse(code).ast);
  }
  const parse = (await load("@astrojs/compiler")) as (
    code: string,
    options: { position: boolean },
  ) => Promise<{ ast: unknown }>;
  return async (code) => goElements(code, (await parse(code, { position: true })).ast);
});

// Astro 7: elements are JSXElements (in the markup and inside {expressions}
// alike), with UTF-16 offsets, like JavaScript strings.
type RsNode = {
  type: string;
  start: number;
  name?: { type: string; name: string };
  attributes: { name?: { name?: string } }[];
};
function rsElements(ast: unknown): AstroElement[] {
  const found: AstroElement[] = [];
  walkAst<RsNode>((ast as { body?: unknown } | null)?.body, (node) => {
    if (node.type !== "JSXOpeningElement" || node.name?.type !== "JSXIdentifier") return;
    const stamped = node.attributes.some((a) => a.name?.name === "data-spotnote");
    found.push({ tag: node.name.name, start: node.start, stamped });
  });
  return found;
}

// Astro 5 and 6: native tags are "element" or "custom-element" nodes (components
// are "component"). Their offsets count UTF-8 bytes, so the start comes from the
// line and column, which count characters. <html> comes without a position: it
// isn't stamped.
type GoNode = {
  type: string;
  name: string;
  position?: { start: { line: number; column: number } };
  attributes: { name: string }[];
};
function goElements(code: string, ast: unknown): AstroElement[] {
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
  const found: AstroElement[] = [];
  walkAst<GoNode>(ast, (node) => {
    if (!["element", "custom-element", "component"].includes(node.type) || !node.position) return;
    const { line, column } = node.position.start;
    const stamped = node.attributes.some((a) => a.name === "data-spotnote");
    found.push({ tag: node.name, start: lineStarts[line - 1] + column - 1, stamped });
  });
  return found;
}

// Not stamped: <script> and <style>, which Astro would stop bundling once they
// have an attribute, and <slot>, which isn't an element in the page.
const ASTRO_SKIP = new Set(["script", "style", "slot"]);

async function stampAstro(
  code: string,
  file: string,
  base: string,
  elementsOf: ElementsOf,
  used: Use[],
): Promise<Stamped> {
  const elements = await elementsOf(code);
  const rel = path.relative(base, file).replace(/\\/g, "/") || file;
  const name = path.basename(file, path.extname(file));
  const s = new MagicString(code);
  // A native tag is lowercase; components are capitalized or member names (<Foo.Bar>).
  for (const { tag, start, stamped } of elements) {
    const { line, column } = offsetToLineCol(code, start);
    if (tag[0] !== tag[0].toLowerCase()) used.push([tag, line, column]); // where a component is used
    if (stamped || tag[0] !== tag[0].toLowerCase() || ASTRO_SKIP.has(tag)) continue;
    s.appendLeft(start + 1 + tag.length, ` data-spotnote="${rel}:${line}:${column}" data-spotnote-name="${name}"`);
  }
  // Astro pages send no other JavaScript to the browser unless they hydrate a
  // component, so each .astro file brings the picker in a script of its own
  // (Astro bundles it, and loads it once per page). At the end: no line moves.
  s.append(`\n<script>import "virtual:spotnote-client";${usesScript(rel, used)}</script>\n`);
  return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
}

// Hands the page where each component is used in a file: [name, line, column]
// for every <Component> in it, which the prompt reads (client/prompt.js).
const usesScript = (rel: string, used: Use[]) =>
  `\n(globalThis.__spotnoteUses ??= {})[${JSON.stringify(rel)}] = ${JSON.stringify(used)};`;

// Which framework compiles .jsx/.tsx here, from the plugins in the config —
// the extension alone can't tell React from Solid. null = none or both.
function jsxFramework(plugins: readonly Plugin[]): "react" | "solid" | null {
  const names = plugins.map((p) => p.name || "");
  const react = names.some((n) => n.startsWith("vite:react"));
  const solid = names.includes("solid");
  return react === solid ? null : react ? "react" : "solid";
}

// The Git repository's root around `dir`, or `dir` itself outside one.
function repoRoot(dir: string): string {
  for (let d = dir; ; d = path.dirname(d)) {
    if (existsSync(path.join(d, ".git"))) return d;
    if (path.dirname(d) === d) return dir;
  }
}

// The commit a build is made from, for prompts: the location is from that
// commit, and the agent's checkout may have moved on. From Git, or from the
// CI's environment when it builds without the repository's history.
function headCommit(dir: string): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: dir, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .slice(0, 7);
  } catch {
    const env = process.env;
    const sha = env.GITHUB_SHA || env.VERCEL_GIT_COMMIT_SHA || env.CF_PAGES_COMMIT_SHA || env.COMMIT_REF;
    return sha ? sha.slice(0, 7) : null;
  }
}

export interface SpotnoteOptions {
  /**
   * Files not to stamp: globs relative to the Vite root, or RegExps matched
   * against the absolute path. For a file whose lowercase JSX isn't the DOM
   * and shares a tag name with it, such as React Three Fiber's `<line>`.
   */
  exclude?: FilterPattern;
  /**
   * spotnote-mcp's port. Defaults to `SPOTNOTE_PORT`, then 4848. Set the
   * same port in your agent's `SPOTNOTE_PORT`.
   */
  port?: number;
  /**
   * Modes to also run in `vite build` for, such as `["staging"]` for
   * `vite build --mode staging`: a staging or preview deploy that reviewers
   * write notes on. Prompts then name the commit the build is made from. The
   * build shows source paths: never list your production mode.
   */
  build?: string[];
  /**
   * A URL that gets each note as it's sent (Enter, new or rewritten): a POST
   * whose body is JSON, sent as `text/plain` so no CORS setup is needed:
   * `{ event: "note.add" | "note.update", sentAt, note: { key, text, page,
   * targets: [{ file, line, column, instance }], commit, prompt } }`, where
   * `commit` is the commit a build is made from (null on the dev server). The page holds
   * the URL, so point it at your own endpoint, not a secret one (client/webhook.js).
   */
  webhook?: string;
}

/**
 * Spotnote — a dev-only Vite plugin.
 *
 * Stamps `data-spotnote="file:line:column"` onto host elements (JSX via a Babel
 * pass, `.vue` templates via `vue/compiler-sfc`, `.svelte` markup via
 * `svelte/compiler`, `.astro` markup via Astro's compiler) and auto-injects the browser
 * picker client. It runs only on the dev server (and in builds in a `build` mode),
 * so production builds and Vitest runs are untouched.
 *
 * Add it once to your Vite `plugins`; the options are optional.
 *
 * @example
 * import spotnote from "spotnote";
 * export default defineConfig({ plugins: [react(), spotnote()] });
 */
export default function spotnote({ exclude, port, build = [], webhook }: SpotnoteOptions = {}): Plugin[] {
  // Dev only, but for builds in a `build` mode: production builds are
  // untouched. Not under Vitest either, which runs a dev server too: stamps
  // would change tests' DOM and snapshots, and the spotnote-mcp check would
  // keep the test run from exiting.
  const apply: Plugin["apply"] = (_, { command, mode }) =>
    (command === "serve" || (command === "build" && build.includes(mode))) && !process.env.VITEST;
  const mcpPort = port ?? (Number(process.env.SPOTNOTE_PORT) || 4848);
  let building = false;
  let commit: string | null = null; // in a build, the commit it's made from
  let stamps: (id: string) => boolean = () => true; // whether a file is stamped: everything but `exclude`
  let transformSync: typeof import("@babel/core").transformSync;
  let root = process.cwd();
  let top = root; // the repository's root: stamped paths are relative to it
  let jsx: "react" | "solid" | null = null;
  const uses = new Map<string, Use[]>(); // file -> where components are used in it, for the client plugin below
  const main: Plugin = {
    name: "spotnote",
    apply,
    enforce: "pre", // stamp before the framework compiler processes the JSX

    configResolved(config) {
      root = config.root;
      // Agents work from the repository's root, so paths in prompts start
      // there too (apps/web/src/App.jsx in a monorepo, not src/App.jsx).
      top = repoRoot(root);
      stamps = createFilter(null, exclude, { resolve: root });
      jsx = jsxFramework(config.plugins);
      building = config.command === "build";
      if (building) commit = headCommit(root);
    },
    // Tell pages whether spotnote-mcp is running, so they connect to it only
    // then: a page retrying a closed port would fill its console with errors.
    configureServer(server) {
      let up = false;
      const check = async () => {
        const now = await fetch(`http://127.0.0.1:${mcpPort}/health`)
          .then((r) => r.json())
          .then(
            (j: { spotnote?: unknown }) => j.spotnote === 1,
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
      server.middlewares.use("/__spotnote/open", (req, res) => {
        const q = new URL(req.url ?? "", "http://x").searchParams;
        const reply = (status: number, body: Record<string, string>) => {
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
          (_, err) => void (err && server.config.logger.warn(`[spotnote] couldn't open ${at}: ${err}`)),
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
    // In a build, no root: it only names the app to spotnote-mcp, which a
    // deployed page doesn't reach, and it's a path on the machine that built it.
    load(id) {
      if (id === RESOLVED) {
        return `import { initInspector } from ${JSON.stringify(clientEntry)};\ninitInspector(${JSON.stringify({ jsx, root: building ? "" : root, port: mcpPort, about: ABOUT, commit, webhook: webhook ?? null })});`;
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
        if (!stamps(file)) return;

        if (/\.(jsx|tsx)$/.test(file)) {
          let res: BabelFileResult | null;
          try {
            res = transformSync(code, {
              filename: file,
              root: top, // what stamped paths are relative to (plugin.ts)
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
            return skipped(file, root); // syntax our config doesn't enable
          }
          if (!res || res.code == null) return;
          uses.set(file, (res.metadata as { spotnoteUses?: Use[] }).spotnoteUses ?? []);
          return { code: res.code, map: res.map };
        }

        // Only the raw SFC import — skip the ?vue&type= sub-requests that the
        // Vue plugin derives from our already-stamped code.
        if (file.endsWith(".vue") && !id.includes("?")) {
          const parse = await getVueParse(root);
          if (!parse) return;
          const used: Use[] = [];
          uses.set(file, used);
          try {
            return stampVueTemplate(code, file, top, parse, used);
          } catch {
            return skipped(file, root);
          }
        }

        // Raw .svelte import only — skip the ?svelte&type= sub-requests.
        if (file.endsWith(".svelte") && !id.includes("?")) {
          const parse = await getSvelteParse(root);
          if (!parse) return;
          const used: Use[] = [];
          uses.set(file, used);
          try {
            return stampSvelte(code, file, top, parse, used);
          } catch {
            return skipped(file, root);
          }
        }

        // Raw .astro import only — skip the ?astro&type= sub-requests.
        if (file.endsWith(".astro") && !id.includes("?")) {
          const elementsOf = await getAstroElements(root);
          if (!elementsOf) return;
          try {
            return await stampAstro(code, file, top, elementsOf, []);
          } catch {
            return skipped(file, root);
          }
        }
      },
    },
  };

  // Boot the picker from the browser's copy of every component file (.jsx, .tsx,
  // .vue, .svelte), so the app doesn't have to import it. Not from index.html: SvelteKit, Nuxt
  // and other SSR frameworks don't serve one. Runs after the framework compiler,
  // when even a .vue or .svelte file is JavaScript. The import goes at the end
  // (imports are hoisted), so no line moves and the source map stays as it is.
  const client: Plugin = {
    name: "spotnote:client",
    apply,
    enforce: "post",
    transform(code, id, options) {
      if (options?.ssr || id.includes("node_modules") || !/\.(jsx|tsx|vue|svelte)$/.test(id)) return;
      const rel = path.relative(top, id).replace(/\\/g, "/");
      const got = uses.get(id);
      const used = got ? usesScript(rel, got) : "";
      return { code: `${code}\nimport ${JSON.stringify(VIRTUAL)};${used}`, map: null };
    },
  };
  return [main, client];
}
