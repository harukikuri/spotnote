---
name: examples-new-framework
description: Add an example app for another framework (Preact, …) or a new major of one (React 20, Vite 9, …) to examples/, run the E2E tests against it, build it in CI, and mark it tested in the docs. Use when the user wants to support, test or demo a framework or version Spotnote doesn't have an example for, or when a Renovate PR brings a new major.
---

# Add an example app

A framework version counts as "Tested" in the docs once an example app for it
passes the whole E2E suite. Every app is its own package:
`examples/<framework>/<app>/`, named `spotnote-examples-<app>`, with its own
`package.json` and Vite (or Astro) config. See "Examples layout" in
DEVELOPMENT.md for the apps there are, and the Vite each one runs on.

## 1. A new major of a framework that has apps (React 20, …)

The newest app (`react19`) is the one the others are copied from.

1. Copy it to the new app (`react/react20`), without `node_modules`, `dist` or
   `.astro`. Set its `package.json`: `name`, `description`, the new major.
2. Make it the source in `examples/sync.mjs` (`from`), and add the old newest to
   its `to`. In `renovate.json`, add the old newest to the apps with no major updates.
3. Pick its Vite: the newest, unless that leaves a Vite major with no app of
   this framework family worth keeping. Keep the table in DEVELOPMENT.md and in
   `docs/content/docs/reference/framework-support.mdx` in step.

A new Vite major (Vite 9): move the newest app of each framework onto it, and
keep the Vite it leaves covered by another app.

## 2. A framework with no apps yet (Preact, …)

Copy the closest app and port it: Preact from `react/react19`.

- The same page: a `.hero` with an `h1`, cards with an `h3` from a loop, the
  placeholder `Bar` component. The E2E tests pick these through `ALL` in
  `e2e/playwright.config.js`.
- Use the framework's own Vite plugin, after `spotnote()` or before: order
  doesn't matter (stamping runs as `order: "pre"`).
- Several majors? One app each, and a family in `examples/sync.mjs` if they can
  share their files.

Then `pnpm install`, start it (`pnpm --filter spotnote-examples-<app> dev`) and
check elements get `data-spotnote` and a note's prompt names the right file and
line.

## 3. Does Spotnote itself need a change?

- JSX: `jsxFramework()` in `package/src/index.ts` tells React from Solid by Vite
  plugin name, for the framework mark in the UI. A new JSX framework shows as
  "JSX" until it's added there and in `FRAMEWORKS` / the icons in
  `package/src/client/icons.ts`.
- Another file type or compiler (not JSX, `.vue`, `.svelte` or `.astro`), or a
  new major whose compiler gives another AST: stamping is new work, a
  stamper in `package/src/stamp/` (see `shared.ts`) added to `STAMPERS` in
  `package/src/index.ts`. Stop and plan it with the user first.
- A compiler Spotnote parses (Vue, Svelte, Astro): add the new app to its loop
  in `package/test/stamp.test.js`.

## 4. Test it

- Add it to `ALL` in `e2e/playwright.config.js` (its `name`, `dir` and what the
  tests pick) and to the `e2e` matrix in `.github/workflows/e2e.yml`.
- `E2E_APPS=<app> pnpm test:e2e`, then `pnpm test:e2e`: every test, in the new
  project too. A test that can't apply to it gets a `test.skip` with the reason.
- CI builds every example app and runs `node examples/sync.mjs --check`: nothing
  to add there.

## 5. Docs

- `docs/content/docs/reference/framework-support.mdx`: its row ("Tested (<fw>
  <versions>)"), the Vite table, and a "Per framework" section if it has rules
  of its own.
- The framework lists in `docs/content/docs/index.mdx` (Works with) and
  `package/README.md`.
- `DEVELOPMENT.md`: the examples table.

Commit as `feat: <Framework> <version> example app, tested end to end` (it's
news for users: one more version that's tested).
