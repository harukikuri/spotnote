# Development

Spotnote is a dev-only Vite plugin. This repo is a pnpm workspace with three parts:

- `plugin/` — the plugin + browser picker (published as `spotnote`; ships raw source)
- `playground/` — framework demo apps that consume the plugin
- `docs/` — the documentation site (Fumadocs / Next.js)

## Develop

```bash
pnpm install                                  # from the repo root — links the workspace
pnpm dev                                      # React playground (multi-page demo) + picker
pnpm --filter spotnote-playground dev:solid   # Solid playground
pnpm --filter spotnote-playground dev:vue     # Vue playground
pnpm --filter spotnote-playground dev:svelte  # Svelte playground
pnpm --filter spotnote-playground build       # production build (picker excluded — apply:'serve')
```

Plugin layout (`plugin/`):

- `src/index.js` — the Vite plugin `spotnote()`
- `src/plugin.cjs` — the Babel visitor that stamps `data-spotnote`
- `src/client/` — the browser picker (inspector / launcher / ui)

Playground layout (`playground/`):

- `<framework>/` — a demo app per framework (`react`, `solid`, `vue`, `svelte`)
- `vite.config.js` — boots the `SPOTNOTE_FW`-selected app with `spotnote()` +
  the framework plugin; imports the plugin via the `spotnote` workspace link

See `plugin/README.md` for the full picker layout and the pick → note → clipboard flow.

### Use it in another Vite app

```js
import spotnote from "spotnote";
export default defineConfig({ plugins: [react(), spotnote()] });
```

## Docs

```bash
cd docs
pnpm install
pnpm dev
```
