# Development

Spotnote is a dev-only Vite plugin. This repo is a pnpm workspace with five parts:

- `package/` — the plugin + browser picker (published as `spotnote`; ships raw source)
- `mcp/` — the MCP server agents start (published as `spotnote-mcp`)
- `examples/` — framework demo apps that consume the plugin
- `docs/` — the documentation site (Fumadocs / Next.js)
- `e2e/` — browser tests (Playwright) against every example app

## Develop

```bash
pnpm install                                  # from the repo root — links the workspace
pnpm dev                                      # React example (multi-page demo) + picker
pnpm --filter spotnote-examples dev:solid     # Solid example
pnpm --filter spotnote-examples dev:vue       # Vue example
pnpm --filter spotnote-examples dev:svelte    # Svelte 5 example
pnpm dev:svelte4                              # Svelte 4 example (own package)
pnpm --filter spotnote-examples build         # production build (picker excluded — apply:'serve')
pnpm test                                     # package + mcp tests (node:test, no extra deps)
pnpm test:e2e                                 # browser tests in e2e/ (Playwright; first: pnpm --filter spotnote-e2e exec playwright install chromium)
pnpm lint                                     # format + lint check (Biome, config in biome.json)
pnpm format                                   # apply Biome's formatting and safe fixes
```

CI runs on every push to main and every PR: `test.yml` (unit + E2E) and
`ci.yml` (lint, docs build, example builds).

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

Examples layout (`examples/`):

- `<framework>/` — a demo app per framework (`react`, `solid`, `vue`, `svelte`)
- `svelte4/` — a Svelte 4 app in its own package (Svelte 4 and 5 can't share
  one `node_modules`), with its own `vite.config.js`
- `vite.config.js` — boots the `SPOTNOTE_FW`-selected app with `spotnote()` +
  the framework plugin; imports the plugin via the `spotnote` workspace link

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

1. Set the same version in `package/package.json` and `mcp/package.json`, commit, push.
2. Tag it: `git tag v0.2.0 && git push origin v0.2.0`.

The `Release` workflow (`.github/workflows/release.yml`) then runs the tests,
checks the tag matches both versions, publishes `spotnote` and `spotnote-mcp`
to npm (with provenance), and creates the GitHub release. It publishes through
npm's trusted publishing: each package's Settings → Trusted Publisher on
npmjs.com names `harukikuri/spotnote` and `release.yml`, so there's no token.
