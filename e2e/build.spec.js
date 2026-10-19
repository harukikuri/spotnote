// Spotnote in a staging build (the `build` option), served by `vite preview`
// instead of the dev server: the picker is there, and prompts name the commit.
import { execSync } from "node:child_process";
import { test, expect, clickEdge, openLauncher } from "./fixtures.js";

const clipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

test("a note in a staging build copies a prompt with the commit it's built from", async ({ page, app }) => {
  await page.goto("/");
  await openLauncher(page);
  await clickEdge(page.locator(app.title).first());
  await page.locator(".sn-panel [data-spotnote-input]").fill("Make the title bigger");
  await page.keyboard.press("Enter");

  await expect(page.locator(".sn-pin")).toHaveCount(1);
  const commit = execSync("git rev-parse HEAD").toString().slice(0, 7);
  const prompt = await clipboard(page);
  expect(prompt).toContain(`- file: ${app.file}\n- line: `);
  expect(prompt).toContain(`- commit: ${commit} (`);
});
