// Spotnote in a real browser: the launcher, picking, the note panel, pins, the
// copied prompt and the launcher's menus — in each playground app. Spotnote's
// UI lives in an open shadow root, which Playwright's CSS locators reach into.
import { test as base, expect } from "@playwright/test";

// The app under test and the elements to pick in it (projects in playwright.config.js).
const test = base.extend({ app: [{}, { option: true }] });
const basename = (file) => file.split("/").pop();

// Click an element away from the placeholder bars inside it, so the click lands
// on the element itself (its right edge), not on a stamped child.
async function clickEdge(locator) {
  const box = await locator.boundingBox();
  await locator.click({ position: { x: box.width - 3, y: box.height / 2 } });
}

async function openLauncher(page) {
  await page.locator(".snl-core").click();
  await expect(page.locator(".snl")).toHaveAttribute("data-open", "true");
}

async function writeNote(page, target, text) {
  await clickEdge(target);
  const panel = page.locator(".sn-panel");
  await expect(panel).toBeVisible();
  await panel.locator("[data-spotnote-input]").fill(text);
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
}

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".snl-core")).toBeVisible();
});

test("a note leaves a numbered pin and copies a prompt with the exact spot", async ({ page, app }) => {
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());

  const panel = page.locator(".sn-panel");
  await expect(panel).toContainText(`${basename(app.file)}:`);
  await panel.locator("[data-spotnote-input]").fill("Make the title bigger");
  await page.keyboard.press("Enter");

  await expect(page.locator(".sn-pin")).toHaveCount(1);
  await expect(page.locator(".sn-pin")).toHaveText("1");
  const prompt = await clipboard(page);
  expect(prompt).toContain("## Request\nMake the title bigger");
  expect(prompt).toContain(`- file: ${app.file}\n- line: `);
  expect(prompt).toContain("- element: <h1>");
  expect(prompt).toContain("## Current computed styles");
});

test("a repeated element is named by its instance", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.repeated).nth(1), "Shorter title");
  expect(await clipboard(page)).toContain(`- instance: 2 of ${app.count} rendered from this line`);
});

test("notes survive a reload and open from the notes list", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Kept across reloads");

  await page.reload();
  await expect(page.locator(".snl")).toHaveAttribute("data-open", "false"); // always starts closed
  await expect(page.locator(".sn-pin")).toBeHidden(); // pins hide with the launcher

  await openLauncher(page);
  await expect(page.locator(".sn-pin")).toBeVisible();
  await page.locator(".snl-item").nth(1).click(); // Notes
  const notes = page.locator(".snl-notes");
  await expect(notes).toContainText("Kept across reloads");
  await notes.getByText("Kept across reloads").click();
  await expect(page.locator(".sn-panel [data-spotnote-input]")).toHaveText("Kept across reloads");
});

test("deleting a note asks first", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Delete me");

  await page.locator(".sn-pin").click();
  await page.locator('.sn-panel button[title="Remove note"]').click();
  await expect(page.locator(".sn-confirm")).toContainText("Delete this note?");
  await page.locator(".sn-confirm").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".sn-pin")).toHaveCount(0);
});

test("Esc closes the panel, then pauses selecting", async ({ page, app }) => {
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());
  await expect(page.locator(".sn-panel")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".sn-panel")).toHaveCount(0);
  await expect(page.locator(".snl")).toHaveAttribute("data-paused", "false");

  await page.keyboard.press("Escape");
  await expect(page.locator(".snl")).toHaveAttribute("data-paused", "true");
});

test("holding Alt picks without opening the launcher", async ({ page, app }) => {
  const h1 = page.locator(app.title).first();
  const box = await h1.boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await expect(page.locator(".sn-hover-label")).toHaveClass(/sn-on/);
  await expect(page.locator(".sn-hover-label")).toContainText("h1");
  await page.mouse.click(box.x + box.width - 3, box.y + box.height / 2);
  await page.keyboard.up("Alt");
  await expect(page.locator(".sn-panel")).toContainText(`${basename(app.file)}:`);
});

test("Settings shows the agent isn't connected", async ({ page }) => {
  await openLauncher(page);
  await page.locator(".snl-item").nth(2).click(); // Settings
  const settings = page.locator(".snl-settings");
  await expect(settings).toContainText("Coding agent");
  await expect(settings).toContainText("Not connected");
});
