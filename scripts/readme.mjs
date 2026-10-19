// The npm page of `spotnote` shows package/README.md: the repository's README,
// with its relative image paths made absolute (npm can't follow them).
//
//   node scripts/readme.mjs           write package/README.md
//   node scripts/readme.mjs --check   fail if it's out of date
import { readFileSync, writeFileSync } from "node:fs";

const RAW = "https://raw.githubusercontent.com/harukikuri/spotnote/main/";
const root = new URL("../", import.meta.url);
const want = readFileSync(new URL("README.md", root), "utf8").replace(
  /(src|srcset)="(?!https?:|#)([^"]+)"/g,
  (_, attr, path) => `${attr}="${RAW}${path}"`,
);
const out = new URL("package/README.md", root);

if (process.argv.includes("--check")) {
  if (readFileSync(out, "utf8") !== want) {
    console.error("package/README.md is out of date: run `node scripts/readme.mjs`.");
    process.exit(1);
  }
} else {
  writeFileSync(out, want);
}
