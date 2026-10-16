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
// (besides package.json and the Vite / Astro config, which always are). only:
// just these files and folders; into: where they go in the copy.
const FAMILIES = [
  { from: "react/react19", to: ["react/react17", "react/react18"], own: ["main.jsx"] },
  { from: "vue/vue35", to: ["vue/vue32", "vue/vue34"] },
  { from: "solid/solid19", to: ["solid/solid19-vite5"] },
  { from: "astro/astro7", to: ["astro/astro5", "astro/astro6"] },
  // Svelte 4 and 5 are written differently: only the styles are shared.
  { from: "svelte/svelte5", to: ["svelte/svelte4"], only: ["styles.css"] },
  // The meta-framework apps show the same page, from a folder of their own.
  {
    from: "react/react19",
    to: ["meta/react-router7", "meta/react-router8"],
    only: ["pages", "components", "router.jsx", "styles.css"],
    into: "app/demo",
  },
  {
    from: "vue/vue35",
    to: ["meta/nuxt3", "meta/nuxt4"],
    only: ["pages", "components", "router.js", "styles.css"],
    into: "app/demo",
  },
  {
    from: "svelte/svelte5",
    to: ["meta/sveltekit2", "meta/sveltekit3"],
    only: ["App.svelte", "components", "styles.css"],
    into: "src/lib/demo",
  },
  { from: "solid/solid19", to: ["meta/solidstart1", "meta/solidstart2"], only: ["App.jsx"], into: "src/demo" },
];
const ALWAYS_OWN = new Set(["package.json", "vite.config.js", "astro.config.mjs", "node_modules", "dist", ".astro"]);

// Every file of `dir` this family shares, relative to it.
function shared(dir, { own = [], only }) {
  const out = [];
  const walk = (rel) => {
    for (const name of readdirSync(path.join(dir, rel))) {
      const file = path.join(rel, name);
      if (name.startsWith(".")) continue;
      if (!rel && (only ? !only.includes(name) : ALWAYS_OWN.has(name) || own.includes(name))) continue;
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
      const dst = path.join(here, to, family.into ?? "", file);
      if (existsSync(dst) && readFileSync(dst).equals(readFileSync(src))) continue;
      if (check) {
        console.error(`out of date: ${path.relative(here, dst)} (from examples/${family.from})`);
        stale++;
      } else cpSync(src, dst); // makes the folders it needs
    }
  }
}
if (stale) {
  console.error("Run `node examples/sync.mjs` to copy them.");
  process.exit(1);
}
