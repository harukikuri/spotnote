// Spotnote — a self-contained Vite plugin. Add it once and it:
//   1. stamps `data-spotnote="file:line:col"` on host JSX elements (dev only,
//      and builds in a `build` mode),
//   2. auto-injects the browser picker client into the page.
// No manual Babel wiring, no client import in your entry.
//
//   import spotnote from "spotnote";
//   export default defineConfig({ plugins: [react(), spotnote()] });
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createFilter, type FilterPattern, type Plugin } from "vite";
import { serveOpenEditor } from "./open-editor.ts";
import { usesScript, VIRTUAL, type Stamper, type Use } from "./stamp/shared.ts";
import { jsx as jsxStamper } from "./stamp/jsx.ts";
import { vue } from "./stamp/vue.ts";
import { svelte } from "./stamp/svelte.ts";
import { astro } from "./stamp/astro.ts";

const require = createRequire(import.meta.url);
const pkg: { version: string; repository: { url: string } } = require("../package.json");
// For the Settings footer: "Spotnote v0.0.0" and a link to the repository.
const ABOUT = { version: pkg.version, repo: pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "") };
// The picker: TypeScript next to this file in the repository, built to
// JavaScript in the published package.
const clientEntry = fileURLToPath(
  new URL(`./client/inspector.${import.meta.url.endsWith(".ts") ? "ts" : "js"}`, import.meta.url),
);
const RESOLVED = "\0" + VIRTUAL;

// Each kind of file Spotnote stamps (see stamp/shared.ts).
const STAMPERS: Stamper[] = [jsxStamper, vue, svelte, astro];

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
   * the URL, so point it at your own endpoint, not a secret one (client/webhook.ts).
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

      // File links in the page → your editor (open-editor.ts).
      serveOpenEditor(server, root, top);
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

        const stamper = STAMPERS.find((st) => st.handles(file, id));
        if (!stamper) return;
        const used: Use[] = [];
        try {
          const out = await stamper.stamp(code, file, { root, top }, used);
          if (out === null) return; // the app doesn't have its compiler
          uses.set(file, used);
          return out;
        } catch {
          return skipped(file, root);
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
