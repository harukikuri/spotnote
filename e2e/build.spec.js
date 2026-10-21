// Spotnote in a staging build (the `build` option), served by `vite preview`
// instead of the dev server: the picker is there, prompts name the commit, and
// notes go to the webhook.
import { execSync } from "node:child_process";
import { test, expect, clickEdge, openLauncher, webhookReceiver } from "./fixtures.js";

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

test("each note sent goes to the webhook: added, then rewritten", async ({ page, app }) => {
  const { got, close } = await webhookReceiver(app.webhookPort);
  try {
    await page.goto("/");
    await openLauncher(page);
    await clickEdge(page.locator(app.title).first());
    await page.locator(".sn-panel [data-spotnote-input]").fill("Make the title bigger");
    await page.keyboard.press("Enter");
    await expect.poll(() => got.length).toBe(1);

    const [added] = got;
    expect([added.method, added.url]).toEqual(["POST", "/notes"]);
    expect(added.type).toMatch(/^multipart\/form-data; boundary=/); // the `screenshot` option is on here
    expect(added.body.event).toBe("note.add");
    expect(added.body.note).toMatchObject({ text: "Make the title bigger", page: expect.stringContaining("/") });
    expect(added.body.note.targets[0]).toMatchObject({ file: app.file, instance: 1 });
    expect(added.body.note.commit).toBe(execSync("git rev-parse HEAD").toString().slice(0, 7));
    expect(added.body.note.prompt).toContain("## Request\nMake the title bigger");
    // The screenshot: an image of the title and around it, which decodes.
    expect(added.screenshot.name).toBe("screenshot.webp");
    expect(added.screenshot.type).toBe("image/webp");
    const size = await page.evaluate(
      async (bytes) => {
        const img = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/webp" }));
        return [img.width, img.height];
      },
      [...new Uint8Array(await added.screenshot.arrayBuffer())],
    );
    const title = await page.locator(app.title).first().boundingBox();
    expect(size[0]).toBeGreaterThan(title.width);
    expect(size[1]).toBeGreaterThan(title.height);

    await page.locator(".sn-pin").click();
    await page.locator(".sn-panel [data-spotnote-input]").fill("Make the title smaller");
    await page.keyboard.press("Enter");
    await expect.poll(() => got.length).toBe(2);
    expect(got[1].body).toMatchObject({
      event: "note.update",
      note: { key: added.body.note.key, text: "Make the title smaller" },
    });
  } finally {
    close();
  }
});
