// Spotnote in a staging build (the `build` option), served by `vite preview`
// instead of the dev server: the picker is there, prompts name the commit, and
// notes go to the webhook.
import { execSync } from "node:child_process";
import http from "node:http";
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

test("each note sent goes to the webhook: added, then rewritten", async ({ page, app }) => {
  const got = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      got.push({ method: req.method, url: req.url, type: req.headers["content-type"], body: JSON.parse(body) });
      res.end();
    });
  });
  await new Promise((r) => server.listen(app.webhookPort, "127.0.0.1", r));
  try {
    await page.goto("/");
    await openLauncher(page);
    await clickEdge(page.locator(app.title).first());
    await page.locator(".sn-panel [data-spotnote-input]").fill("Make the title bigger");
    await page.keyboard.press("Enter");
    await expect.poll(() => got.length).toBe(1);

    const [added] = got;
    expect([added.method, added.url, added.type]).toEqual(["POST", "/notes", "text/plain;charset=UTF-8"]);
    expect(added.body.event).toBe("note.add");
    expect(added.body.note).toMatchObject({ text: "Make the title bigger", page: expect.stringContaining("/") });
    expect(added.body.note.targets[0]).toMatchObject({ file: app.file, instance: 1 });
    expect(added.body.note.prompt).toContain("## Request\nMake the title bigger");

    await page.locator(".sn-pin").click();
    await page.locator(".sn-panel [data-spotnote-input]").fill("Make the title smaller");
    await page.keyboard.press("Enter");
    await expect.poll(() => got.length).toBe(2);
    expect(got[1].body).toMatchObject({
      event: "note.update",
      note: { key: added.body.note.key, text: "Make the title smaller" },
    });
  } finally {
    server.close();
  }
});
