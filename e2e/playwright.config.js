// End-to-end tests: every playground app (../playground) in dev, driven in
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
];

const devServer = ({ name, port }) =>
  name === "svelte4"
    ? `pnpm --filter spotnote-playground-svelte4 exec vite --port ${port} --strictPort`
    : `pnpm --filter spotnote-playground exec vite --port ${port} --strictPort`;

export default defineConfig({
  testDir: ".",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    permissions: ["clipboard-read", "clipboard-write"], // to read the copied prompt
    trace: "retain-on-failure",
  },
  projects: APPS.map((app) => ({
    name: app.name,
    use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${app.port}`, app },
  })),
  webServer: APPS.map((app) => ({
    command: devServer(app),
    url: `http://localhost:${app.port}`,
    reuseExistingServer: !process.env.CI,
    // SPOTNOTE_PORT: one nothing listens on, so a spotnote-mcp running on this
    // machine can't connect and turn copying off.
    env: { SPOTNOTE_FW: app.name, SPOTNOTE_PORT: "4999" },
  })),
});
