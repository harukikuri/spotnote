// Spotnote in a real browser: the launcher, picking, the note panel, pins, the
// copied prompt and the launcher's menus — in each example app, with no agent
// connected (agent.spec.js has one).
import { test, expect, basename, clickEdge, openLauncher, writeNote } from "./fixtures.js";

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

// The panel's frame (package/src/client/panel-frame.js).
async function openPanel(page, app) {
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());
  const panel = page.locator(".sn-panel");
  await expect(panel).toBeVisible();
  await settled(panel);
  return panel;
}
// After the panel's opening animation, so its box is where it ends up.
const settled = (panel) => panel.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
const drag = async (page, from, to) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
};

test("the panel drags, stays inside the window, and then stays put", async ({ page, app }) => {
  const panel = await openPanel(page, app);
  const box = await panel.boundingBox();
  // Dragging in the note input selects text; it doesn't move the panel.
  const input = await panel.locator("[data-spotnote-input]").boundingBox();
  await drag(page, { x: input.x + 10, y: input.y + 10 }, { x: input.x + 60, y: input.y + 40 });
  expect(await panel.boundingBox()).toEqual(box);

  const grab = { x: box.x + 12, y: box.y + 12 }; // its edge: not the input, not a button
  await drag(page, grab, { x: grab.x - 40, y: grab.y + 30 });
  let moved = await panel.boundingBox();
  expect([Math.round(moved.x - box.x), Math.round(moved.y - box.y)]).toEqual([-40, 30]);

  // Past the top-left corner it stops 8px in. The mouse is released off the
  // panel: that click doesn't reach the page (it would close the panel).
  await drag(page, { x: moved.x + 12, y: moved.y + 12 }, { x: 1, y: 1 });
  moved = await panel.boundingBox();
  expect([moved.x, moved.y]).toEqual([8, 8]);
  await expect(panel).toBeVisible();

  // Moved by hand, it no longer follows its element when the layout changes.
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  moved = await panel.boundingBox();
  expect([moved.x, moved.y]).toEqual([8, 8]);
});

test("the panel resizes from its corner, and every panel keeps the size", async ({ page, app }) => {
  const panel = await openPanel(page, app);
  const box = await panel.boundingBox();
  const grip = await panel.locator(".sn-resize").boundingBox();
  const at = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await drag(page, at, { x: at.x + 80, y: at.y + 60 });
  const sized = await panel.boundingBox();
  expect([Math.round(sized.width - box.width), Math.round(sized.height - box.height)]).toEqual([80, 60]);

  await page.keyboard.press("Escape");
  await expect(page.locator(".sn-panel")).toHaveCount(0); // closed (after its closing animation)
  await clickEdge(page.locator(app.repeated).first()); // another element's panel
  await settled(page.locator(".sn-panel"));
  const next = await page.locator(".sn-panel").boundingBox();
  expect([next.width, next.height]).toEqual([sized.width, sized.height]);

  // Not smaller than 260 × 140.
  const g = await page.locator(".sn-panel .sn-resize").boundingBox();
  await drag(page, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, { x: next.x + 10, y: next.y + 10 });
  const small = await page.locator(".sn-panel").boundingBox();
  expect([small.width, small.height]).toEqual([260, 140]);
});

test("a click away from an unsent note shakes the panel instead of closing it", async ({ page, app }) => {
  const panel = await openPanel(page, app);
  await panel.locator("[data-spotnote-input]").fill("Not sent yet");
  await clickEdge(page.locator(app.repeated).first());
  expect(await panel.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(panel.locator("[data-spotnote-input]")).toHaveText("Not sent yet");
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
