// The example apps of one framework show the same page on different versions:
// one app is the source, and this copies its files into the others. Run it
// after editing the source app; `--check` (CI) fails if a copy is out of date.
//
//   node examples/sync.mjs [--check]
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// from: the source app; to: its copies; own: files each app keeps for itself
// (besides package.json and the Vite / Astro config, which always are).
const FAMILIES = [
  { from: "react/react19", to: ["react/react17", "react/react18"], own: ["main.jsx"] },
  { from: "vue/vue35", to: ["vue/vue32", "vue/vue34"] },
  { from: "solid/solid19", to: ["solid/solid19-vite5"] },
  { from: "astro/astro7", to: ["astro/astro5", "astro/astro6"] },
  // Svelte 4 and 5 are written differently: only the styles are shared.
  { from: "svelte/svelte5", to: ["svelte/svelte4"], only: ["styles.css"] },
];
const ALWAYS_OWN = new Set(["package.json", "vite.config.js", "astro.config.mjs", "node_modules", "dist", ".astro"]);

// Every file of `dir` this family shares, relative to it.
function shared(dir, { own = [], only }) {
  if (only) return only;
  const out = [];
  const walk = (rel) => {
    for (const name of readdirSync(path.join(dir, rel))) {
      const file = path.join(rel, name);
      if (name.startsWith(".") || (!rel && (ALWAYS_OWN.has(name) || own.includes(name)))) continue;
      if (statSync(path.join(dir, file)).isDirectory()) walk(file);
      else out.push(file);
    }
  };
  walk("");
  return out;
}

const check = process.argv.includes("--check");
let stale = 0;
for (const family of FAMILIES) {
  const from = path.join(here, family.from);
  for (const to of family.to) {
    for (const file of shared(from, family)) {
      const src = path.join(from, file);
      const dst = path.join(here, to, file);
      if (existsSync(dst) && readFileSync(dst).equals(readFileSync(src))) continue;
      if (check) {
        console.error(`out of date: examples/${to}/${file} (from examples/${family.from})`);
        stale++;
      } else cpSync(src, dst);
    }
  }
}
if (stale) {
  console.error("Run `node examples/sync.mjs` to copy them.");
  process.exit(1);
}
