// Coverage of Spotnote's browser client (package/src/client) from the E2E runs,
// with COVERAGE=1: each test adds what Chromium ran (see `coverage` in
// spotnote.spec.js), globalSetup starts clean and globalTeardown prints it.
import MCR from "monocart-coverage-reports";

export const coverage = () =>
  MCR({
    name: "Spotnote E2E coverage",
    outputDir: "./coverage", // the HTML report: coverage/index.html
    reports: ["console-details", "v8"],
    // Vite serves the client from /@fs/…/package/src/client/; its source maps name
    // each file by its basename. styles.js and icons.js are just strings.
    entryFilter: (entry) => /\/package\/src\/client\/(?!styles\.js|icons\.js)/.test(entry.url),
    sourcePath: (file) => `package/src/client/${file}`,
  });

export default async function globalSetup() {
  if (process.env.COVERAGE) coverage().cleanCache();
}
