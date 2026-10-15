// Spotnote with a coding agent: the real spotnote-mcp (mcp/src/cli.js) over
// stdio, driven by an MCP client playing the agent, and the page it talks to.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { test, expect, openLauncher, writeNote } from "./fixtures.js";

const repo = path.resolve(fileURLToPath(import.meta.url), "../..");
test.describe.configure({ mode: "serial" }); // one agent, one store, for the whole file

let agent, home;
test.beforeAll(async ({ app }) => {
  home = mkdtempSync(path.join(tmpdir(), "spotnote-e2e-"));
  agent = new Client({ name: "claude-code", version: "1.0.0" });
  await agent.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.join(repo, "mcp/src/cli.js")],
      cwd: repo, // the agent works at the repository root: the example app is inside
      env: { ...process.env, SPOTNOTE_PORT: String(app.mcpPort), SPOTNOTE_HOME: home },
    }),
  );
});
test.afterAll(async () => {
  await agent?.close();
  rmSync(home, { recursive: true, force: true });
});

const tool = async (name, args = {}) => (await agent.callTool({ name, arguments: args })).content[0].text;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".snl-core")).toBeVisible();
});

test("Settings shows the agent connected", async ({ page }) => {
  await openLauncher(page);
  await page.locator(".snl-item").nth(2).click(); // Settings
  await expect(page.locator(".snl-settings")).toContainText("Connected");
});

test("a note goes to the agent, and its question and its answer come back", async ({ page, app }) => {
  test.setTimeout(60_000); // watch_notes waits 3s for a batch, twice
  await openLauncher(page);
  await expect(page.locator(".sn-panel")).toHaveCount(0);
  await writeNote(page, page.locator(app.title).first(), "Make the title bigger");
  const pin = page.locator(".sn-pin");

  // The agent gets the note with its exact spot; the pin shows it's working on it.
  const got = await tool("watch_notes", { timeout_seconds: 30 });
  expect(got).toContain("## Request\nMake the title bigger");
  expect(got).toContain(`- file: ${app.file}`);
  const id = got.match(/\(id: ([^)]+)\)/)[1];
  await expect(pin).toHaveClass(/sn-working/);

  // It asks, in Markdown with file links; the pin shows a question.
  await tool("reply_note", { id, message: `How much **bigger**? It's set in \`${app.file}:5\` (not \`nope.jsx\`).` });
  await expect(pin).toHaveClass(/sn-asked/);
  await pin.click();
  const said = page.locator(".sn-panel .sn-msg-agent");
  await expect(said).toContainText("Claude Code");
  await expect(said.locator("strong")).toHaveText("bigger");

  // Its file links: one opens nothing (no GUI editor here, see LAUNCH_EDITOR), one isn't there.
  await said.locator("button.sn-file", { hasText: "nope.jsx" }).click();
  await expect(said.locator(".sn-file-hint").last()).toHaveAttribute("aria-label", /Couldn't find this file/);
  await said.locator("button.sn-file", { hasText: `${app.file}:5` }).click();
  await expect(said.locator(".sn-file-hint").first()).toHaveAttribute("aria-label", /No editor is running/);

  // You answer in the panel; it reaches the agent, which makes the change.
  await page.locator(".sn-panel [data-spotnote-input]").fill("Twice as big");
  await page.keyboard.press("Enter");
  const answer = await tool("watch_notes", { timeout_seconds: 30 });
  expect(answer).toContain("## Conversation\n- you: How much **bigger**?");
  expect(answer).toContain("- developer: Twice as big");
  await tool("resolve_note", { id, summary: "Doubled its size." });
  await expect(pin).toHaveClass(/sn-done/);
});

test("an editor picked in Settings opens the agent's file links through its URL", async ({ page, app }) => {
  // Record the editor URLs the page opens, instead of handing them to the OS.
  await page.addInitScript(() => {
    window.opened = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.protocol === "cursor:") window.opened.push(this.href);
      else click.call(this);
    };
  });
  await page.reload();
  await openLauncher(page);
  await page.locator(".snl-item").nth(2).click(); // Settings
  await page.locator(".snl-settings select").selectOption("cursor");
  await page.keyboard.press("Escape"); // close Settings

  await page.locator(".sn-pin").first().click(); // the note the agent answered above
  await page.locator(".sn-panel .sn-msg-agent button.sn-file", { hasText: `${app.file}:5` }).click();
  await expect
    .poll(() => page.evaluate(() => window.opened))
    .toEqual([`cursor://file${path.join(repo, "examples/react", app.file)}:5`]);
});

test("a second agent session reaches the notes through the first", async ({ page, app }) => {
  // A second agent session relays to the first (the owner of the port).
  const second = new Client({ name: "codex", version: "1.0.0" });
  await second.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.join(repo, "mcp/src/cli.js")],
      cwd: repo,
      env: { ...process.env, SPOTNOTE_PORT: String(app.mcpPort), SPOTNOTE_HOME: home },
    }),
  );
  await openLauncher(page);
  await writeNote(page, page.locator(app.repeated).first(), "Shorter title");
  const listed = (await second.callTool({ name: "list_notes", arguments: {} })).content[0].text;
  expect(listed).toContain("Shorter title");
  await second.close();
});
