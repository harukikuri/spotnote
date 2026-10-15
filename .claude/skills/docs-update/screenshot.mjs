// A docs screenshot of the launcher and one of its popovers, like the ones in
// docs/public/. Copy this file into e2e/ (where Playwright is installed), change
// the steps in `stage`, run it, then delete the copy:
//   cp .claude/skills/docs-update/screenshot.mjs e2e/_shot.mjs
//   (cd e2e && node _shot.mjs ../docs/public/settings-agent.png) && rm e2e/_shot.mjs
// Needs the React example running: pnpm dev (http://localhost:5173).
import { chromium } from "@playwright/test";

const out = process.argv[2];
const browser = await chromium.launch();
// 2x, light: the docs show each image at half its pixel width (the <img> width).
const page = await browser.newPage({
  viewport: { width: 1100, height: 750 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await page.routeWebSocket(/.*/, () => {}); // keeps these notes off a spotnote-mcp you're running
await page.goto("http://localhost:5173");
const ui = (sel) => page.locator(sel); // Playwright's CSS reaches into Spotnote's shadow root
// biome-ignore lint/correctness/noUnusedVariables: for the steps in stage()
const clickEdge = async (l, modifiers) => {
  const b = await l.boundingBox();
  await l.click({ position: { x: b.width - 3, y: b.height / 2 }, modifiers }); // the element, not a bar inside it
};

// ── What to show: change these steps ──────────────────────────────────
async function stage() {
  await ui(".snl-core").click(); // open the launcher
  await ui(".snl-item").nth(2).click(); // Settings (0: pause, 1: notes, 2: settings)
  await ui(".snl-srow.snl-link").first().click(); // its MCP page
  // A note:   await clickEdge(page.locator(".hero h1"));
  //           await ui(".sn-panel [data-spotnote-input]").fill("Make this bigger");
  //           await page.keyboard.press("Enter");
  // The list: await ui(".snl-item").nth(1).click();
  return ui(".snl-settings"); // the popover or panel to frame
}
// ───────────────────────────────────────────────────────────────────────

const shown = await stage();
// Rest the pointer on the popover's corner: on the page it would light up an
// element, on a launcher button it shows a tooltip.
await shown.hover({ position: { x: 4, y: 4 } });
await page.waitForTimeout(1500); // let the animations finish (the launcher's ✓ after a note)
const pop = await shown.boundingBox();
const core = await ui(".snl-core").boundingBox();
// Frame the popover and the launcher in the corner, with the same margins as the others.
const x = Math.max(0, core.x - 14);
const y = Math.min(pop.y, core.y) - 29;
await page.screenshot({
  path: out,
  clip: { x, y, width: pop.x + pop.width + 37 - x, height: core.y + core.height + 20 - y },
});
await browser.close();
console.log(`${out}: show it at width="${Math.round(pop.x + pop.width + 37 - x)}"`);
