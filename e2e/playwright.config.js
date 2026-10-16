// End-to-end tests: every example app (../examples) in dev, driven in
// Chromium. One project per framework, each with its own dev server and the
// elements the tests pick in it (see `app` in spotnote.spec.js).
import { defineConfig, devices } from "@playwright/test";

// file: where `title` is written, relative to the app's Vite root.
// repeated: one element rendered several times from one line, and how many.
const APPS = [
  { name: "react", port: 5201, file: "pages/Home.jsx", title: ".hero h1", repeated: ".card h3", count: 6 },
  { name: "solid", port: 5202, file: "App.jsx", title: "h1", repeated: "li", count: 3 },
  { name: "vue", port: 5203, file: "pages/Home.vue", title: ".hero h1", repeated: ".card h3", count: 6 },
  { name: "svelte", port: 5204, file: "App.svelte", title: ".hero h1", repeated: ".card h3", count: 6 },
  { name: "svelte4", port: 5205, file: "App.svelte", title: ".hero h1", repeated: ".card h3", count: 3 },
  { name: "astro", port: 5207, file: "src/components/Home.astro", title: ".hero h1", repeated: ".card h3", count: 3 },
];
const AGENT = { ...APPS[0], name: "agent", port: 5206, mcpPort: 4998 };

// --ignore-lock: in the foreground, even where Astro would detect a coding agent
// and start a background server that Playwright couldn't stop.
const devServer = ({ name, port }) =>
  name === "svelte4"
    ? `pnpm --filter spotnote-examples-svelte4 exec vite --port ${port} --strictPort`
    : name === "astro"
      ? `pnpm --filter spotnote-examples-astro exec astro dev --port ${port} --ignore-lock`
      : `pnpm --filter spotnote-examples exec vite --port ${port} --strictPort`;

export default defineConfig({
  testDir: ".",
  globalSetup: "./coverage.js",
  globalTeardown: "./coverage-teardown.js",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    permissions: ["clipboard-read", "clipboard-write"], // to read the copied prompt
    trace: "retain-on-failure",
  },
  projects: [
    ...APPS.map((app) => ({
      name: app.name,
      testIgnore: "agent.spec.js",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${app.port}`, app },
    })),
    // With an agent: one app is enough, the client is the same in every framework.
    {
      name: "agent",
      testMatch: "agent.spec.js",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${AGENT.port}`, app: AGENT },
    },
  ],
  webServer: [
    ...APPS.map((app) => ({
      command: devServer(app),
      url: `http://localhost:${app.port}`,
      reuseExistingServer: !process.env.CI,
      // SPOTNOTE_PORT: one nothing listens on, so a spotnote-mcp running on this
      // machine can't connect and turn copying off.
      env: { SPOTNOTE_FW: app.name, SPOTNOTE_PORT: "4999" },
    })),
    {
      command: devServer(AGENT),
      url: `http://localhost:${AGENT.port}`,
      reuseExistingServer: !process.env.CI,
      // The spotnote-mcp that agent.spec.js starts; and "vim" as the editor, so
      // opening a file says "no editor" instead of launching one.
      env: { SPOTNOTE_FW: "react", SPOTNOTE_PORT: String(AGENT.mcpPort), LAUNCH_EDITOR: "vim" },
    },
  ],
});
