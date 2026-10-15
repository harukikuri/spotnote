// What every spec shares: the `test` with its fixtures, and the steps tests
// take in the page. Spotnote's UI lives in an open shadow root, which
// Playwright's CSS locators reach into.
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
});
export const basename = (file) => file.split("/").pop();

// Click an element away from the placeholder bars inside it, so the click lands
// on the element itself (its right edge), not on a stamped child.
export async function clickEdge(locator) {
  const box = await locator.boundingBox();
  await locator.click({ position: { x: box.width - 3, y: box.height / 2 } });
}

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
