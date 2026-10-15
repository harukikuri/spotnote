// Coverage from the E2E runs, with COVERAGE=1: of Spotnote's browser client
// (package/src/client), from what Chromium ran in each test (see `coverage` in
// fixtures.js), and of spotnote-mcp (mcp/src), from the copies agent.spec.js
// starts (NODE_V8_COVERAGE). globalSetup starts clean; globalTeardown prints it.
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MCR from "monocart-coverage-reports";

export const NODE_COVERAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), "coverage/node");

export const coverage = () =>
  MCR({
    name: "Spotnote E2E coverage",
    outputDir: "./coverage", // the HTML report: coverage/index.html
    reports: ["console-details", "v8"],
    // Vite serves the client from /@fs/…/package/src/client/, and its source maps
    // name each file by its basename. styles.js and icons.js are just strings.
    entryFilter: (entry) => /\/package\/src\/client\/(?!styles\.js|icons\.js)|\/mcp\/src\//.test(entry.url),
    sourcePath: (file) =>
      file.includes("mcp/src/") ? file.replace(/^.*(mcp\/src\/)/, "$1") : `package/src/client/${file}`,
  });

export default async function globalSetup() {
  if (!process.env.COVERAGE) return;
  coverage().cleanCache();
  rmSync(NODE_COVERAGE, { recursive: true, force: true });
}
