// After a change to Spotnote's UI: copies the client's look into the videos
// again, renders them, and puts them where the docs show them.
//
//   pnpm --filter spotnote-demo run refresh
//
// 1. Runs the React 19 example (port 5300; no spotnote-mcp, so the panel shows
//    "Add & copy" as on a page without an agent) and captures the UI from it.
// 2. Renders every video (scripts/render.js).
// 3. Copies them into docs/public/. The README's copies are on GitHub: someone
//    uploads those by hand.
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync } from "node:fs";

const PORT = 5300;
const DOCS = {
  "out/demo.mp4": "../docs/public/staging-demo.mp4",
  "out/demo-solo.mp4": "../docs/public/solo-demo.mp4",
  "out/quick-start-click.mp4": "../docs/public/quick-start-click.mp4",
  "out/quick-start-note.mp4": "../docs/public/quick-start-note.mp4",
};

if (
  await fetch(`http://localhost:${PORT}/`).then(
    () => true,
    () => false,
  )
)
  throw new Error(`Port ${PORT} is taken: stop what runs there (it may be an old copy of the example)`);
const server = spawn(
  "pnpm",
  ["--filter", "spotnote-examples-react19", "exec", "vite", "--port", String(PORT), "--strictPort"],
  { env: { ...process.env, SPOTNOTE_PORT: "4999" }, stdio: "ignore", detached: true },
);
try {
  for (let i = 0; ; i++) {
    if (
      await fetch(`http://localhost:${PORT}/`).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    if (i === 60) throw new Error(`The React 19 example didn't start on port ${PORT}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  execFileSync("node", ["scripts/capture.js"], {
    stdio: "inherit",
    env: { ...process.env, URL: `http://localhost:${PORT}/` },
  });
} finally {
  try {
    process.kill(-server.pid); // the dev server and what pnpm started under it
  } catch {
    /* it has already stopped */
  }
}

execFileSync("node", ["scripts/render.js"], { stdio: "inherit" });
for (const [from, to] of Object.entries(DOCS)) {
  copyFileSync(from, to);
  console.log(`[refresh] ${from} → ${to.replace("../", "")}`);
}
