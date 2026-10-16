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
The E2E tests run in six apps (React, Solid, Vue, Svelte 5, Svelte 4, Astro): pick
elements through `app.title` / `app.repeated`, not one app's markup.

## Conventions

- Pre-1.0: change the note format, the wire format and stored data directly. No
  fallbacks for an older `spotnote-mcp` or old saved notes; `spotnote` and
  `spotnote-mcp` always ship together, at the same version.
- Plain JavaScript, no build step: `package/` ships its source as is.
- Comments say what a piece is for and why, in short plain sentences; match the
  density of the code around them.
- A change users see updates its page in `docs/content/docs/` in the same
  commit, and its screenshot in `docs/public/` if it shows the change.
- Commits: `feat:`, `fix:`, `perf:`, `docs:`, `test:`, `ci:`, `chore:`,
  `release:`. The release notes are made from `feat:`, `fix:` and `perf:`, so
  write those for users. No AI attribution in commits or PRs.
