// What every spec shares: the `test` with its fixtures, and the steps tests
// take in the page. Spotnote's UI lives in an open shadow root, which
// Playwright's CSS locators reach into.
import http from "node:http";
import { test as base, expect } from "@playwright/test";
import { coverage } from "./coverage.js";

export { expect };

// The app under test and the elements to pick in it (projects in playwright.config.js),
// and, with COVERAGE=1, what each test ran of the client (see coverage.js).
export const test = base.extend({
  app: [{}, { option: true, scope: "worker" }],
  coverage: [
    async ({ page }, use) => {
      if (!process.env.COVERAGE) return use();
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      await coverage().add(await page.coverage.stopJSCoverage());
    },
    { auto: true },
  ],
  // No errors in the page: a stamp that differs between the server's HTML and
  // the browser's (a hydration mismatch) shows up here, and so would Spotnote's own.
  pageErrors: [
    async ({ page }, use) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        // A failed request is logged too: some tests expect one (a file not found).
        if (/^Failed to load resource/.test(m.text())) return;
        if (m.type() === "error" || /hydrat/i.test(m.text())) errors.push(m.text());
      });
      await use();
      expect(errors, "errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});
export const basename = (file) => file.split("/").pop();

// Click an element away from the placeholder bars inside it, so the click lands
// on the element itself (its right edge), not on a stamped child.
export async function clickEdge(locator, options = {}) {
  const box = await locator.boundingBox();
  await locator.click({ position: { x: box.width - 3, y: box.height / 2 }, ...options });
}
export const shiftClick = (locator) => clickEdge(locator, { modifiers: ["Shift"] });

export async function openLauncher(page) {
  await page.locator(".snl-core").click();
  await expect(page.locator(".snl")).toHaveAttribute("data-open", "true");
}

export async function writeNote(page, target, text) {
  await clickEdge(target);
  const panel = page.locator(".sn-panel");
  await expect(panel).toBeVisible();
  await panel.locator("[data-spotnote-input]").fill(text);
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
}

// A webhook to send notes to (the plugin's `webhook` option): what it got, each
// { method, url, type, body, screenshot } with the body parsed (a multipart
// one's `payload`, and its `screenshot` file), and a way to stop it.
export async function webhookReceiver(port) {
  const got = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const type = req.headers["content-type"];
      const raw = Buffer.concat(chunks);
      const form =
        type.startsWith("multipart/") && (await new Response(raw, { headers: { "content-type": type } }).formData());
      const body = JSON.parse(form ? form.get("payload") : raw.toString());
      got.push({ method: req.method, url: req.url, type, body, screenshot: form ? form.get("screenshot") : null });
      res.end();
    });
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { got, close: () => server.close() };
}
