// Copies Spotnote's real UI into the video: drives the client in the React 19
// example app and saves the markup of each state the video shows (the
// launcher, the hover label, the note panel, a pin) to src/spotnote/snapshots.js.
// Run it after a change to the client's look:
//
//   pnpm --filter spotnote-examples-react19 exec vite --port 5300   (in another terminal)
//   pnpm --filter spotnote-demo capture
//
// The stylesheet isn't copied: the video imports it from package/src/client.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const APP = process.env.URL || "http://localhost:5300/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(APP);
await page.locator(".snl-core").waitFor();

// The markup of the parts of Spotnote's shadow root that match `selector`,
// without the launcher's menus (the video never opens them).
const grab = (selector) =>
  page.evaluate((s) => {
    const el = document.querySelector("spotnote-root").shadowRoot.querySelector(s).cloneNode(true);
    for (const pop of el.querySelectorAll(".snl-pop")) pop.remove();
    return el.outerHTML;
  }, selector);

const snap = {};
snap.launcherClosed = await grab(".snl");
await page.locator(".snl-core").click();
snap.launcherOpen = await grab(".snl");
const card = page.locator(".card").first();
const box = await card.boundingBox();
await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
await page.waitForTimeout(300);
snap.hoverLabel = await grab(".sn-hover-label");
await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
await page.locator(".sn-panel").waitFor();
await page.waitForTimeout(400);
snap.panel = await grab(".sn-panel");
await page.keyboard.type("x");
await page.keyboard.press("Enter");
await page.waitForTimeout(150);
snap.launcherDone = await grab(".snl"); // the ✓ for a moment after copying
snap.pin = await grab(".sn-pin");
await page.waitForTimeout(1500);
snap.launcherAfter = await grab(".snl");
await browser.close();

// Placeholders for what the video sets per frame: {{loc}} the element's file
// and line, {{text}} the note, and positions and sizes.
const loc = /Home\.jsx:35/g;
const t = {
  launcherClosed: snap.launcherClosed,
  launcherOpen: snap.launcherOpen,
  launcherDone: snap.launcherDone,
  launcherAfter: snap.launcherAfter,
  hoverLabel: snap.hoverLabel.replace(loc, "{{loc}}").replace(/style="transform: [^;]*;"/, 'style="{{style}}"'),
  panel: snap.panel
    .replace(loc, "{{loc}}")
    .replace(/(Open )[^"]*( in your editor)/, "$1{{loc}}$2")
    .replace(/left: [\d.]+px; top: [\d.]+px; transform-origin: [^;]*;/, "{{style}}")
    .replace(/(data-spotnote-input="1"[^>]*>)[^<]*(<\/div>)/, "$1{{text}}$2"),
  pin: snap.pin.replace(/left: [\d.]+px; top: [\d.]+px;/, "{{style}}"),
};
for (const [k, v] of Object.entries(t))
  if (/Home\.jsx|[^-]left: \d/.test(v)) console.warn(`[capture] ${k}: a value wasn't replaced`);

const out = fileURLToPath(new URL("../src/spotnote/snapshots.js", import.meta.url));
writeFileSync(
  out,
  "// Spotnote's real UI, from scripts/capture.js. Don't edit: run `pnpm capture` again.\n" +
    Object.entries(t)
      .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
      .join("\n") +
    "\n",
);
// Formatted as the repository formats it, so an unchanged UI changes nothing.
execFileSync("npx", ["biome", "format", "--write", out], { stdio: "ignore" });
console.log("[capture] wrote src/spotnote/snapshots.js");
