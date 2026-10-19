// End-to-end tests: every example app (../examples) in dev, driven in
// Chromium. One project per app (a framework at one version, on one Vite), each
// with its own dev server and the elements the tests pick in it (see `app` in
// spotnote.spec.js). E2E_APPS=react19,vue3_2 runs only those (CI: one per job,
// .github/workflows/test.yml).
import { defineConfig, devices } from "@playwright/test";

// What the tests pick, per framework. file: where `title` is written, relative
// to the Vite root (below, it becomes the path from the repository's root). repeated: one element rendered several times from one
// line, and how many.
const REACT = { file: "pages/Home.jsx", title: ".hero h1", repeated: ".card h3", count: 6 };
const VUE = { file: "pages/Home.vue", title: ".hero h1", repeated: ".card h3", count: 6 };
const SOLID = { file: "App.jsx", title: "h1", repeated: "li", count: 3 };
const ASTRO = { file: "src/components/Home.astro", title: ".hero h1", repeated: ".card h3", count: 3, astro: true };
const SVELTE = { file: "App.svelte", title: ".hero h1", repeated: ".card h3", count: 6 };

// Each app is examples/<dir>, the package spotnote-examples-<name>. Every major
// of each framework, spread over Vite 5 to 8.
const ALL = [
  { name: "react17", dir: "react/react17", ...REACT }, // Vite 5
  { name: "react18", dir: "react/react18", ...REACT }, // Vite 6
  { name: "react19", dir: "react/react19", ...REACT }, // Vite 8
  { name: "vue3_2", dir: "vue/vue3_2", ...VUE }, // Vite 5
  { name: "vue3_4", dir: "vue/vue3_4", ...VUE }, // Vite 7
  { name: "vue3_5", dir: "vue/vue3_5", ...VUE }, // Vite 8
  { name: "svelte4", dir: "svelte/svelte4", file: "App.svelte", title: ".hero h1", repeated: ".card h3", count: 3 }, // Vite 5
  { name: "svelte5", dir: "svelte/svelte5", ...SVELTE }, // Vite 7
  { name: "solid1_9-vite5", dir: "solid/solid1_9-vite5", ...SOLID },
  { name: "solid1_9", dir: "solid/solid1_9", ...SOLID }, // Vite 8
  { name: "astro5", dir: "astro/astro5", ...ASTRO }, // Vite 6
  { name: "astro6", dir: "astro/astro6", ...ASTRO }, // Vite 7
  { name: "astro7", dir: "astro/astro7", ...ASTRO }, // Vite 8
  // Meta-frameworks: the same pages (copied into a folder of their own by
  // examples/sync.mjs), rendered on the server first. srcRoot: where the Vite
  // root is in the app, when it isn't the app's folder (Nuxt's app/).
  { name: "sveltekit2", dir: "meta/sveltekit2", ...SVELTE, file: "src/lib/demo/App.svelte" }, // Vite 5
  { name: "sveltekit3", dir: "meta/sveltekit3", ...SVELTE, file: "src/lib/demo/App.svelte" }, // Vite 8
  { name: "nuxt3", dir: "meta/nuxt3", ...VUE, srcRoot: "app", file: "demo/pages/Home.vue", dev: "nuxt dev" }, // Vite 7
  { name: "nuxt4", dir: "meta/nuxt4", ...VUE, srcRoot: "app", file: "demo/pages/Home.vue", dev: "nuxt dev" }, // Vite 8
  {
    name: "react-router7",
    dir: "meta/react-router7",
    ...REACT,
    file: "app/demo/pages/Home.jsx",
    dev: "react-router dev",
  }, // Vite 5
  {
    name: "react-router8",
    dir: "meta/react-router8",
    ...REACT,
    file: "app/demo/pages/Home.jsx",
    dev: "react-router dev",
  }, // Vite 7
  { name: "solidstart1", dir: "meta/solidstart1", ...SOLID, file: "src/demo/App.jsx", dev: "vinxi dev" }, // vinxi, Vite 6
  { name: "solidstart2", dir: "meta/solidstart2", ...SOLID, file: "src/demo/App.jsx" }, // Vite 8
].map((app, i) => ({
  ...app,
  // As prompts give it: from the repository's root.
  file: ["examples", app.dir, app.srcRoot, app.file].filter(Boolean).join("/"),
  port: 5201 + i,
}));
// With an agent: one app is enough, the client is the same in every framework.
const AGENT = { ...ALL.find((a) => a.name === "react19"), name: "agent", port: 5230, mcpPort: 4998 };
// A staging build (the `build` option), served by `vite preview`: again one app.
const STAGING = { ...ALL.find((a) => a.name === "react19"), name: "staging", port: 5231, webhookPort: 4997 };

const only = process.env.E2E_APPS?.split(",");
const APPS = only ? ALL.filter((a) => only.includes(a.name)) : ALL;
const withAgent = !only || only.includes("agent");
const withStaging = !only || only.includes("staging");

// --ignore-lock: in the foreground, even where Astro would detect a coding agent
// and start a background server that Playwright couldn't stop.
const devServer = ({ name, port, astro, dev }) =>
  `pnpm --filter spotnote-examples-${name === "agent" ? "react19" : name} exec ` +
  (astro
    ? `astro dev --port ${port} --ignore-lock`
    : dev
      ? `${dev} --port ${port}`
      : `vite --port ${port} --strictPort`);

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
      testIgnore: ["agent.spec.js", "build.spec.js"],
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${app.port}`, app },
    })),
    ...(withAgent
      ? [
          {
            name: "agent",
            testMatch: "agent.spec.js",
            use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${AGENT.port}`, app: AGENT },
          },
        ]
      : []),
    ...(withStaging
      ? [
          {
            name: "staging",
            testMatch: "build.spec.js",
            use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${STAGING.port}`, app: STAGING },
          },
        ]
      : []),
  ],
  webServer: [
    ...APPS.map((app) => ({
      command: devServer(app),
      url: `http://localhost:${app.port}`,
      reuseExistingServer: !process.env.CI,
      // SPOTNOTE_PORT: one nothing listens on, so a spotnote-mcp running on this
      // machine can't connect and turn copying off.
      env: { SPOTNOTE_PORT: "4999" },
    })),
    ...(withAgent
      ? [
          {
            command: devServer(AGENT),
            url: `http://localhost:${AGENT.port}`,
            reuseExistingServer: !process.env.CI,
            // The spotnote-mcp that agent.spec.js starts; and "vim" as the editor, so
            // opening a file says "no editor" instead of launching one.
            env: { SPOTNOTE_PORT: String(AGENT.mcpPort), LAUNCH_EDITOR: "vim" },
          },
        ]
      : []),
    ...(withStaging
      ? [
          {
            command:
              "pnpm --filter spotnote-examples-react19 exec sh -c " +
              `"vite build --mode staging && vite preview --port ${STAGING.port} --strictPort"`,
            url: `http://localhost:${STAGING.port}`,
            reuseExistingServer: !process.env.CI,
            // Built in: build.spec.js listens there for the notes.
            env: { SPOTNOTE_WEBHOOK: `http://127.0.0.1:${STAGING.webhookPort}/notes` },
          },
        ]
      : []),
  ],
});
