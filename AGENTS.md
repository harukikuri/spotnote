# Agent instructions

Spotnote is a dev-only Vite plugin (`package/`, published as `spotnote`) and the
MCP server agents start (`mcp/`, published as `spotnote-mcp`). The layout, the
commands and the release steps are in [DEVELOPMENT.md](DEVELOPMENT.md): read it
first.

## Before you commit

```bash
pnpm lint        # Biome: format + lint (pnpm format applies the fixes)
pnpm test        # unit tests: package + mcp (node:test)
pnpm test:e2e    # browser tests, every example app (Playwright)
```

Run all three for any change under `package/` or `mcp/`. A UI change gets an E2E
test in `e2e/spotnote.spec.js` (or `e2e/agent.spec.js` when the agent is in it).
The E2E tests run in an app per framework version (React 17–19, Vue 3.2–3.5,
Svelte 4–5, Solid, Astro 5–7, on Vite 5–8; and SvelteKit, Nuxt, React Router and
SolidStart, two majors each): pick elements through `app.title` /
`app.repeated`, not one app's markup. Edit the newest app of a framework and run
`node examples/sync.mjs` to copy it to the others.

## Conventions

- Pre-1.0: change the note format, the wire format and stored data directly. No
  fallbacks for an older `spotnote-mcp` or old saved notes; `spotnote` and
  `spotnote-mcp` always ship together, at the same version.
- TypeScript that Node runs as is (type stripping, Node 22.18 or later): no
  build while you work. Only syntax Node can erase (no enums, namespaces or
  parameter properties), imports name their `.ts` files, and `unknown` over
  `any`. npm gets a build: `tsc` to `dist/`, swapped in by `publishConfig` when
  the release packs it. Both packages are TypeScript.
- Comments say what a piece is for and why, in short plain sentences; match the
  density of the code around them.
- A change users see updates its page in `docs/content/docs/` in the same
  commit, and its screenshot in `docs/public/` if it shows the change.
- Commits: `feat:`, `fix:`, `perf:`, `docs:`, `test:`, `ci:`, `chore:`,
  `release:`. The release notes are made from `feat:`, `fix:` and `perf:`, so
  write those for users.
