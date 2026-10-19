# Development

Spotnote is a dev-only Vite plugin. This repo is a pnpm workspace with seven parts:

- `package/` — the plugin + browser picker (published as `spotnote`; ships raw source)
- `mcp/` — the MCP server agents start (published as `spotnote-mcp`)
- `examples/` — framework demo apps that consume the plugin
- `docs/` — the documentation site (Fumadocs / Next.js)
- `playground/` — the docs' playground at `/try`: a small shop built with
  Spotnote in it (the `build` option) into `docs/public/try/` by the docs' `dev` and `build`
- `demo/` — the demo videos (Remotion); `pnpm --filter spotnote-demo run refresh`
  rebuilds them after a UI change
- `e2e/` — browser tests (Playwright) against every example app, and one with a
  real spotnote-mcp and an MCP client playing the agent (`agent.spec.js`)

## Develop

```bash
pnpm install                                  # from the repo root — links the workspace
pnpm dev                                      # React 19 example (multi-page demo) + picker
pnpm --filter spotnote-examples-vue3_5 dev     # any example app: spotnote-examples-<app> (see below)
pnpm --filter "./examples/**" build           # production builds (picker excluded — apply:'serve')
node examples/sync.mjs                        # after editing an example: copy it to its other versions
pnpm test                                     # package + mcp tests (node:test, no extra deps)
pnpm coverage                                 # the same tests, with a coverage report of the files they load (c8; HTML in coverage/)
pnpm test:e2e                                 # browser tests in e2e/ (Playwright; first: pnpm --filter spotnote-e2e exec playwright install chromium)
E2E_APPS=vue3_2,agent pnpm test:e2e            # only these apps (agent: the tests with spotnote-mcp)
pnpm coverage:e2e                             # the browser tests, with a coverage report of package/src/client and mcp/src (HTML in e2e/coverage/)
pnpm lint                                     # format + lint check (Biome, config in biome.json)
pnpm format                                   # apply Biome's formatting and safe fixes
```

CI runs on every push to main and every PR: `test.yml` (unit), `e2e.yml` (E2E,
one job per example app, side by side; the docs link its latest run) and
`ci.yml` (lint, docs build, example builds, `sync.mjs --check`). Renovate updates the example apps weekly
(`renovate.json`): a new framework or Vite major shows up as a PR, labelled
"new major".

Plugin layout (`package/`):

- `src/index.js` — the Vite plugin `spotnote()`: stamping, client injection, MCP status
- `src/plugin.cjs` — the Babel visitor that stamps `data-spotnote` in JSX
- `src/client/` — the browser picker, auto-injected in dev:
  - `inspector.js` — picking, note panel, pins, HMR re-bind
  - `prompt.js` — source locations and the prompt built from them
  - `panel-frame.js` — dragging, resizing and shaking the note panel
  - `conversation.js` — the agent's messages in the panel
  - `open-file.js` — file links → your editor
  - `launcher.js` — corner button and its menu (pause · notes · settings)
  - `notes-list.js` — the launcher's Notes popover
  - `settings-menu.js` — the launcher's Settings popover
  - `ui.js` — the shadow root, accents, the icon button and `el()`
  - `styles.js` — theme tokens and the stylesheet
  - `icons.js` — framework, note-state, agent, button and launcher icons
  - `layers.js` — stacking of the panel, notes list and Settings; what `Esc` closes
  - `remote.js` — the link to spotnote-mcp while it runs
  - `settings.js` — accent, theme and editor, per browser
  - `markdown.js` — the Markdown subset for the agent's messages
  - `confirm.js` — the "are you sure?" dialog over a panel

MCP layout (`mcp/`):

- `src/cli.js` — entry point (stdio); owns port 4848 or relays to the copy that does
- `src/http.js` — the owner's HTTP server for browsers and relays
- `src/store.js` — the notes, saved under `~/.spotnote/`
- `src/tools.js` — the agent's tools (`watch_notes`, `reply_note`, …)

To try local MCP changes, point your agent at the source instead of npm:

```bash
claude mcp add spotnote-dev -- node /absolute/path/to/spotnote/mcp/src/cli.js
```

Examples layout (`examples/`): every major of each framework, as an app of its
own (`examples/<framework>/<app>/`, the package `spotnote-examples-<app>`),
spread over Vite 5 to 8. Each is a whole Vite (or Astro) app with its own
`package.json` and config.

| App | Framework | Vite |
| --- | --- | --- |
| `react/react17`, `react18`, `react19` | React 17, 18, 19 | 5, 6, 8 |
| `vue/vue3_2`, `vue3_4`, `vue3_5` | Vue 3.2, 3.4, 3.5 | 5, 7, 8 |
| `svelte/svelte4`, `svelte5` | Svelte 4, 5 | 5, 7 |
| `solid/solid1_9-vite5`, `solid1_9` | Solid 1.9 (vite-plugin-solid needs it) | 5, 8 |
| `astro/astro5`, `astro6`, `astro7` | Astro 5, 6, 7 | 6, 7, 8 (Astro's own) |
| `meta/sveltekit2`, `sveltekit3` | SvelteKit 2, 3 (Svelte 5) | 5, 8 |
| `meta/nuxt3`, `nuxt4` | Nuxt 3, 4 (Vue 3.5) | 7, 8 (Nuxt's own) |
| `meta/react-router7`, `react-router8` | React Router 7, 8, framework mode (React 19) | 5, 7 |
| `meta/solidstart1`, `solidstart2` | SolidStart 1 (vinxi), 2 (Solid 1.9) | 6 (vinxi's own), 8 |

The newest app of each framework is the one to edit (`react19`, `vue3_5`,
`solid1_9`, `astro7`); `node examples/sync.mjs` copies it into the others, and CI
checks they match. A file an app keeps for itself (React 17's `main.jsx`, the
configs) is listed in `sync.mjs`. Svelte 4 and 5 are written differently: only
their styles are shared. The meta-framework apps get the newest app's page in a
folder of their own (`app/demo`, `src/lib/demo`, `src/demo`), shown by their
routes at `/` and `/elsewhere`.

### Use it in another Vite app

```js
import spotnote from "spotnote";
export default defineConfig({ plugins: [react(), spotnote()] });
```

## Docs

```bash
pnpm --filter @spotnote/docs dev              # http://localhost:3000
```

## Release

1. Set the same version in `package/package.json` and `mcp/package.json`, run
   `node scripts/readme.mjs` (npm's README: a copy of the root one), commit, push.
2. Tag it: `git tag v0.2.0 && git push origin v0.2.0`.

The `Release` workflow (`.github/workflows/release.yml`) then runs CI, Test and
E2E (the same workflows as on main, side by side); only if all pass, it checks the
tag matches both versions, publishes `spotnote` and `spotnote-mcp`
to npm (with provenance), and creates the GitHub release, with notes made from
the `feat:`, `fix:` and `perf:` commits since the last tag (changelogithub). So
write those commit messages for users. It publishes through
npm's trusted publishing: each package's Settings → Trusted Publisher on
npmjs.com names `harukikuri/spotnote` and `release.yml`, so there's no token.
