# Contributing

Thanks for helping with Spotnote. Bug reports, fixes, docs and new framework
support are all welcome.

## Report a bug or ask for something

Open an [issue](https://github.com/harukikuri/spotnote/issues/new/choose). For a
bug, say which framework and Vite version, and what the prompt or the page
showed: Spotnote runs on many of them, and most bugs are in one.

## Make a change

1. Fork, then `pnpm install` from the repo root (Node 22.18 or later; pnpm is
   set by `packageManager`).
2. `pnpm dev`: the React 19 example with Spotnote in it, at
   http://localhost:5173. Edits to the browser client (`package/src/client/`)
   show on reload; restart it after changing the plugin (`package/src/index.ts`).
3. Check your change:

   ```bash
   pnpm lint                         # Biome (pnpm format fixes most of it)
   pnpm typecheck                    # TypeScript
   pnpm test                         # unit tests: package + mcp
   E2E_APPS=react19 pnpm test:e2e    # browser tests on one example app
   ```

   The first E2E run needs `pnpm --filter spotnote-e2e exec playwright install chromium`.
   CI runs the E2E tests on every example app (React, Vue, Svelte, Solid, Astro
   and the meta-frameworks, on Vite 5 to 8), so you needn't run them all.
4. Open a pull request. Commit messages start with `feat:`, `fix:`, `perf:`,
   `docs:`, `test:`, `ci:` or `chore:`; the release notes are made from `feat:`,
   `fix:` and `perf:`, so write those for users.

## Where things are

[DEVELOPMENT.md](DEVELOPMENT.md) has the layout of each package, the example
apps and how they're kept in sync, the docs site and the release.
[AGENTS.md](AGENTS.md) has the conventions (it's also what coding agents read):
TypeScript that Node runs as is, `unknown` over `any`, and a test for a UI change.

Good places to start:

- Issues labelled [good first issue](https://github.com/harukikuri/spotnote/labels/good%20first%20issue).
- The docs (`docs/content/docs/`): a page that confused you is worth fixing.
- A framework or version Spotnote doesn't stamp yet: open an issue first, so
  we can plan it together.
