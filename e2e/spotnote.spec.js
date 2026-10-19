// Spotnote in a real browser: the launcher, picking, the note panel, pins, the
// copied prompt and the launcher's menus — in each example app, with no agent
// connected (agent.spec.js has one).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, basename, clickEdge, openLauncher, shiftClick, writeNote } from "./fixtures.js";

const repo = path.resolve(fileURLToPath(import.meta.url), "../..");

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

test("a note edited from its pin keeps its pin and copies the new prompt", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Make the title bigger");

  await page.locator(".sn-pin").click();
  const input = page.locator(".sn-panel [data-spotnote-input]");
  await expect(input).toHaveText("Make the title bigger");
  await input.fill("Make the title smaller");
  await page.keyboard.press("Enter"); // Save
  await expect(page.locator(".sn-panel")).toHaveCount(0);
  await expect(page.locator(".sn-pin")).toHaveText("1");
  await expect.poll(() => clipboard(page)).toContain("## Request\nMake the title smaller"); // written async

  await page.reload();
  await openLauncher(page);
  await page.locator(".sn-pin").click();
  await expect(input).toHaveText("Make the title smaller");
});

test("a note from another page opens there, from the notes list", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Written on the home page");
  // The same app, on another path, once it's running (a page rendered on the
  // server would put the element back as it hydrates)...
  await page.goto("/elsewhere", { waitUntil: "networkidle" });
  // ...and without the element (some apps render the same page on every path)
  await page.evaluate((sel) => document.querySelector(sel)?.remove(), app.title);

  await openLauncher(page);
  await page.locator(".snl-item").nth(1).click(); // Notes
  await page.locator(".snl-notes").getByText("Written on the home page").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".sn-panel [data-spotnote-input]")).toHaveText("Written on the home page");
  await expect(page.locator(".snl")).toHaveAttribute("data-open", "true");
});

// The launcher's Notes list (package/src/client/notes-list.js).
const openNotes = async (page) => {
  await page.locator(".snl-item").nth(1).click();
  return page.locator(".snl-notes");
};

test("the notes list puts this page first, folds a section, and deletes ticked notes", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "On the home page");
  await page.evaluate(() => history.pushState({}, "", "/elsewhere")); // another page, same DOM
  await writeNote(page, page.locator(app.repeated).first(), "On this page");

  const notes = await openNotes(page);
  await expect(notes.locator(".snl-head .snl-count")).toHaveText("(2)");
  const groups = notes.locator(".snl-group button");
  await expect(groups).toHaveText([/This page\s*\(1\)/, /^\/\s*\(1\)/]);
  const rows = notes.locator("li:not(.snl-group)");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("On this page");
  await expect(rows.first().locator(".snl-num")).toHaveText("2"); // numbered as on its pin

  await groups.first().click(); // fold "This page"
  await expect(groups.first()).toHaveAttribute("aria-expanded", "false");
  await expect(rows).toHaveCount(1);
  await groups.first().click();
  await expect(rows).toHaveCount(2);

  // With nothing ticked, the button deletes all (asked first: cancel).
  const del = notes.locator(".snl-del");
  await expect(del).toHaveAttribute("title", "Delete all");
  await del.click();
  await expect(notes.locator(".sn-confirm")).toContainText("Delete all 2 notes?");
  await notes.locator(".sn-confirm").getByRole("button", { name: "Cancel" }).click();
  await expect(rows).toHaveCount(2);

  // Ticked, it deletes those.
  await rows.first().locator(".snl-pick").check();
  await expect(del).toHaveAttribute("title", "Delete 1 note");
  await expect(del).toHaveText("(1)");
  await del.click();
  await notes.locator(".sn-confirm").getByRole("button", { name: "Delete" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("On the home page");

  // "All" of one note is just that note.
  await del.click();
  await expect(notes.locator(".sn-confirm")).toContainText("Delete 1 note?");
  await notes.locator(".sn-confirm").getByRole("button", { name: "Delete" }).click();
  await expect(notes.locator(".snl-empty")).toBeVisible();
});

test("a note whose element is gone is marked, and can still be copied or deleted", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Its element goes away");
  await page
    .locator(app.title)
    .first()
    .evaluate((el) => el.remove());

  const notes = await openNotes(page);
  const row = notes.locator("li.snl-lost");
  await expect(row.locator(".snl-lost-tag")).toHaveText("Not found");
  await page.evaluate(() => navigator.clipboard.writeText(""));
  await row.getByTitle("Copy prompt").click();
  expect(await clipboard(page)).toContain("## Request\nIts element goes away");

  await row.getByTitle("Delete note").click();
  await expect(notes.locator(".snl-empty")).toBeVisible();
  await expect(notes.locator(".snl-del")).toHaveCount(0); // nothing left to delete
});

test("the launcher comes back when the app rebuilds the page, with its notes", async ({ page, app }) => {
  await openLauncher(page);
  await writeNote(page, page.locator(app.title).first(), "Kept through a rebuild");
  // What React does after a hydration error in the app: it renders the whole
  // document again and drops what it didn't render, Spotnote's host among them.
  await page.evaluate(() => document.querySelector("spotnote-root").remove());

  await expect(page.locator(".snl-core")).toBeVisible();
  await expect(page.locator(".sn-pin")).toHaveCount(1);
});

test("an element of a shared component names the line that uses it here", async ({ page, app }) => {
  // The title's placeholder bar is written in the Bar component, and the title
  // uses <Bar> in app.file: changing it there changes only this one.
  await openLauncher(page);
  await writeNote(page, page.locator(`${app.title} > span`).first(), "Only this bar");
  const used = (await clipboard(page)).match(/^- used at: (.+):(\d+) \(<Bar> in \w+\)$/m);
  expect(used?.[1]).toBe(app.file);
  const source = readFileSync(path.join(repo, app.file), "utf8");
  expect(source.split("\n")[used[2] - 1]).toContain("<Bar");
});

test("Shift-click puts one note on several elements, each with the same pin", async ({ page, app }) => {
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());
  const panel = page.locator(".sn-panel");
  const chips = panel.locator(".sn-chip"); // one per element on the note
  const remove = chips.getByTitle("Take off this note");
  await expect(chips).toHaveCount(1);
  await expect(remove).toHaveCount(0);
  await shiftClick(page.locator(app.repeated).nth(0));
  await shiftClick(page.locator(app.repeated).nth(1));
  await expect(chips).toHaveCount(3);
  await expect(remove).toHaveCount(3); // any can come off
  await chips.nth(1).hover(); // lights up its element on the page
  const lit = () =>
    page.evaluate(
      () => [...document.querySelector("spotnote-root").shadowRoot.children].filter((e) => e.style.boxShadow).length,
    );
  await expect.poll(lit).toBe(1);
  await panel.locator("[data-spotnote-input]").hover();
  await expect.poll(lit).toBe(0);
  await shiftClick(page.locator(app.repeated).nth(1)); // again: off
  await expect(chips).toHaveCount(2);
  await shiftClick(page.locator(app.repeated).nth(1));
  await chips.nth(2).getByTitle("Take off this note").click(); // or off from its chip
  await expect(chips).toHaveCount(2);
  await expect(panel).toBeVisible();
  await chips.nth(0).getByTitle("Take off this note").click(); // the first too: the next keys the note
  await expect(chips).toHaveCount(1);
  await expect(remove).toHaveCount(0); // but not the last
  await shiftClick(page.locator(app.title).first()); // back on, last
  await expect(chips).toHaveCount(2);

  await panel.locator("[data-spotnote-input]").fill("Make these match");
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".sn-pin")).toHaveText(["1", "1"]);
  const prompt = await clipboard(page);
  expect(prompt).toMatch(/^## Request\nMake these match\n\n## Target 1 of 2\n- file: /);
  expect(prompt).toMatch(/## Target 1 of 2\n- file: .+\n- line: [\s\S]*- instance: 1 of \d+ rendered/);
  expect(prompt).toContain(`## Target 2 of 2\n- file: ${app.file}`);

  // Either pin opens the note; the list shows it once, on 2 elements.
  await page.locator(".sn-pin").nth(1).click();
  await expect(panel.locator("[data-spotnote-input]")).toHaveText("Make these match");
  await expect(chips).toHaveCount(2);
  await expect(remove).toHaveCount(2);
  await page.keyboard.press("Escape");
  await page.locator(".snl-item").nth(1).click(); // Notes
  await expect(page.locator(".snl-notes li:not(.snl-group)")).toHaveCount(1);
  await expect(page.locator(".snl-notes .snl-more")).toHaveText("+1");

  await page.reload();
  await openLauncher(page);
  await expect(page.locator(".sn-pin")).toHaveText(["1", "1"]);

  // A saved note's first element can come off too: it moves to the next.
  await page.locator(".sn-pin").first().click();
  await chips.nth(0).getByTitle("Take off this note").click();
  await page.keyboard.press("Escape"); // saves on close
  await expect(page.locator(".sn-pin")).toHaveCount(1);
  await page.reload();
  await openLauncher(page);
  await expect(page.locator(".sn-pin")).toHaveCount(1);
  await page.locator(".sn-pin").click();
  await expect(panel.locator("[data-spotnote-input]")).toHaveText("Make these match");
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

  const cursor = () => page.evaluate(() => getComputedStyle(document.body).cursor);
  expect(await cursor()).toBe("crosshair"); // selecting
  await page.keyboard.press("Escape");
  await expect(page.locator(".snl")).toHaveAttribute("data-paused", "true");
  expect(await cursor()).toBe("auto");
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

test("in the narrowest edit panel, the chip's file:line never draws over the tag name", async ({ page, app }) => {
  const panel = await openPanel(page, app);
  const g = await panel.locator(".sn-resize").boundingBox();
  const box = await panel.boundingBox();
  await drag(page, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, { x: box.x + 10, y: box.y + 10 }); // 260 wide
  await panel.locator("[data-spotnote-input]").fill("Make the title bigger");
  await page.keyboard.press("Enter");
  await page.locator(".sn-pin").click(); // its edit panel: Copy and Delete too, so less room for the chip
  await settled(page.locator(".sn-panel"));

  const [tag, loc, chip] = await Promise.all(
    [".sn-chip-el b", ".sn-loc", ".sn-chip"].map((s) => page.locator(`.sn-panel ${s}`).boundingBox()),
  );
  expect(loc.x).toBeGreaterThanOrEqual(tag.x + tag.width);
  expect(loc.x + loc.width).toBeLessThanOrEqual(chip.x + chip.width);
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

// The launcher's Settings (package/src/client/settings-menu.js, settings.js).
const openSettings = async (page) => {
  await openLauncher(page);
  await page.locator(".snl-item").nth(2).click();
  return page.locator(".snl-settings");
};
const host = (page) => page.locator("spotnote-root");

test("Settings: theme, accent and editor apply at once and are kept", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const settings = await openSettings(page);
  const theme = settings.locator(".snl-head .snl-icon-btn");
  await expect(theme).toHaveAttribute("title", /^Theme: Light/);
  await expect(host(page)).toHaveAttribute("data-theme", "light");
  await theme.click(); // Light → Dark → System (here: dark) → Light
  await expect(host(page)).toHaveAttribute("data-theme", "dark");
  await theme.click();
  await expect(theme).toHaveAttribute("title", /^Theme: System/);
  await expect(host(page)).toHaveAttribute("data-theme", "dark");
  await theme.click();
  await expect(host(page)).toHaveAttribute("data-theme", "light");

  const pink = settings.getByRole("radio", { name: "Pink" });
  await pink.click();
  await expect(pink).toHaveAttribute("aria-checked", "true");
  await expect(settings.getByRole("radio", { name: "Yellow" })).toHaveAttribute("aria-checked", "false");
  const accent = () => host(page).evaluate((h) => h.style.getPropertyValue("--sn-accent"));
  expect(await accent()).toBe("#ff375f");
  await settings.locator("select").selectOption("cursor");

  await page.reload();
  const again = await openSettings(page);
  await expect(again.getByRole("radio", { name: "Pink" })).toHaveAttribute("aria-checked", "true");
  await expect(again.locator("select")).toHaveValue("cursor");
  expect(await accent()).toBe("#ff375f");
});

test("Settings: not connected, the agent page shows how to connect", async ({ page }) => {
  const settings = await openSettings(page);
  await expect(settings.locator(".snl-link")).toContainText("Not connected");
  await expect(settings.locator(".snl-ver")).toHaveText(/^v\d+\.\d+\.\d+$/);
  await expect(settings.locator(".snl-ver")).toHaveAttribute("href", /github\.com\/.+\/releases$/);

  await settings.locator(".snl-link").click();
  await expect(settings.locator(".snl-title")).toHaveText("MCP");
  await expect(settings.locator(".snl-steps li")).toHaveCount(2);
  await settings.locator(".snl-cmd-shell").getByRole("button", { name: "Copy" }).click();
  expect(await clipboard(page)).toBe("claude mcp add spotnote -- npx -y spotnote-mcp");

  await settings.getByRole("button", { name: "Back" }).click();
  await expect(settings.locator(".snl-title")).toHaveText("Settings");
});

test("a press on the page closes the open menu, and does nothing else", async ({ page, app }) => {
  await openSettings(page);
  await clickEdge(page.locator(app.title).first());
  await expect(page.locator(".snl-item").nth(2)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".sn-panel")).toHaveCount(0); // the click didn't pick it
  await clickEdge(page.locator(app.title).first());
  await expect(page.locator(".sn-panel")).toBeVisible();
});

test("saving the file keeps the open panel on its element", async ({ page, app }) => {
  test.skip(!!app.astro, "Astro reloads the page when an .astro file is saved, like any server-rendered page");
  const file = path.join(repo, app.file);
  const source = readFileSync(file, "utf8");
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  const rebinds = () => logs.filter((l) => l.includes("selection re-bound after edit")).length;
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());
  const input = page.locator(".sn-panel [data-spotnote-input]");
  await input.fill("Not sent yet");

  let saved = 0; // re-binds before the file goes back (some frameworks re-render more than once)
  try {
    // A change below everything, so no element moves. Vue skips one outside its
    // blocks, and Svelte 5's plugin one that compiles the same (a blank line).
    const edited = file.endsWith(".vue")
      ? source.replace(/<\/template>(?![\s\S]*<\/template>)/, "<!-- edited -->\n</template>")
      : file.endsWith(".svelte")
        ? `${source}\n<i hidden></i>\n`
        : `${source}\n`;
    writeFileSync(file, edited);
    await expect.poll(() => rebinds()).toBeGreaterThan(0);
  } finally {
    saved = rebinds();
    writeFileSync(file, source); // a second update: wait it out too, so nothing moves while we look
  }
  await expect.poll(() => rebinds()).toBeGreaterThan(saved);
  await expect(input).toHaveText("Not sent yet");
  // The selection box is still on the element (it may be a new node, after a remount).
  const onTitle = (sel) =>
    page.evaluate((sel) => {
      const t = document.querySelector(sel)?.getBoundingClientRect();
      return [...document.querySelector("spotnote-root").shadowRoot.children]
        .filter((e) => e.style.border.startsWith("2px solid"))
        .some((e) => {
          const b = e.getBoundingClientRect();
          return !!t && Math.abs(b.x - t.x) < 2 && Math.abs(b.y - t.y) < 2;
        });
    }, sel);
  await expect.poll(() => onTitle(app.title)).toBe(true);
});
