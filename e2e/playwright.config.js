// End-to-end tests: the React playground (../playground) in dev, driven in Chromium.
import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

export default defineConfig({
  testDir: ".",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    permissions: ["clipboard-read", "clipboard-write"], // to read the copied prompt
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter spotnote-playground exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // A port nothing listens on, so a spotnote-mcp running on this machine
    // can't connect and turn copying off.
    env: { SPOTNOTE_FW: "react", SPOTNOTE_PORT: "4999" },
  },
});
