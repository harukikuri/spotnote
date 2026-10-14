# Development

Spotnote is a dev-only Vite plugin. This repo is a pnpm workspace with four parts:

- `plugin/` — the plugin + browser picker (published as `spotnote`; ships raw source)
- `mcp/` — the MCP server agents start (published as `spotnote-mcp`)
- `playground/` — framework demo apps that consume the plugin
- `docs/` — the documentation site (Fumadocs / Next.js)

## Develop

```bash
pnpm install                                  # from the repo root — links the workspace
pnpm dev                                      # React playground (multi-page demo) + picker
pnpm --filter spotnote-playground dev:solid   # Solid playground
pnpm --filter spotnote-playground dev:vue     # Vue playground
pnpm --filter spotnote-playground dev:svelte  # Svelte 5 playground
pnpm dev:svelte4                              # Svelte 4 playground (own package)
pnpm --filter spotnote-playground build       # production build (picker excluded — apply:'serve')
```

Plugin layout (`plugin/`):

- `src/index.js` — the Vite plugin `spotnote()`: stamping, client injection, MCP status
- `src/plugin.cjs` — the Babel visitor that stamps `data-spotnote` in JSX
- `src/client/` — the browser picker, auto-injected in dev:
  - `inspector.js` — picking, note panel, pins, prompt, HMR re-bind
  - `launcher.js` — corner button and its menu (pause · notes · settings)
  - `ui.js` — buttons, icons, accents and theme tokens
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

Playground layout (`playground/`):

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
