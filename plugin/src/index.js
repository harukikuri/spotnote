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
import MagicString from "magic-string";

const require = createRequire(import.meta.url);
const babelVisitor = require("./plugin.cjs"); // the JSX-stamping Babel plugin
const clientEntry = fileURLToPath(new URL("./client/inspector.js", import.meta.url));

const VIRTUAL = "virtual:spotnote-client";
const RESOLVED = "\0" + VIRTUAL;

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
        // column → 0-based to match the JSX stamps (Vue reports 1-based).
        s.appendLeft(pos, ` data-spotnote="${rel}:${line}:${column - 1}" data-spotnote-name="${name}"`);
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

export default function spotnote() {
  let transformSync;
  let root = process.cwd();
  return {
    name: "spotnote",
    apply: "serve", // dev only — production builds are untouched
    enforce: "pre", // stamp before the framework compiler processes the JSX

    configResolved(config) {
      root = config.root; // so stamped paths are relative to the app root

      // We stamp with enforce:"pre", so we beat normal-enforce compilers (Vue,
      // React) automatically. But another *pre* JSX compiler (e.g. Solid) listed
      // before us in the plugins array runs first and compiles the JSX away —
      // then our stamp finds nothing. config.plugins is in execution order, so a
      // framework compiler appearing before us here means the order is wrong.
      // Only pre-enforce JSX compilers (Solid, Qwik) are order-sensitive; React
      // and Vue run at normal enforce, so we always beat them — don't warn there.
      const plugins = config.plugins || [];
      const me = plugins.findIndex((p) => p && p.name === "spotnote");
      const isPreCompiler = (p) => /solid|qwik/i.test(p.name || "");
      const before = me > 0 && plugins.slice(0, me).find((p) => p && isPreCompiler(p));
      if (before) {
        console.warn(
          `[spotnote] "${before.name}" runs before spotnote() — list spotnote() BEFORE your framework plugin in vite.config, ` +
            `or its data-spotnote stamp lands on already-compiled code and nothing gets marked.`,
        );
      }
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
        return `import { initInspector } from ${JSON.stringify(clientEntry)};\ninitInspector();`;
      }
    },

    // Stamp host elements with their source location.
    async transform(code, id) {
      if (id.includes("node_modules")) return;
      const file = id.split("?")[0];

      if (/\.(jsx|tsx)$/.test(file)) {
        const res = transformSync(code, {
          filename: file,
          root,
          plugins: [babelVisitor],
          parserOpts: { plugins: ["jsx", "typescript"] },
          configFile: false,
          babelrc: false,
          sourceMaps: true,
        });
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
    },

    // Inject the client so the app doesn't have to import it.
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: `/@id/${VIRTUAL}` }, injectTo: "body" }];
    },
  };
}
