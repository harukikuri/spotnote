---
name: examples-new-framework
description: Add an example app for another framework (Preact, a new Svelte or Vue major, …) to examples/, run the E2E tests against it, build it in CI, and mark it tested in the docs. Use when the user wants to support, test or demo a framework Spotnote doesn't have an example for.
---

# Add a framework example

A framework counts as "Tested" in the docs once an example app for it passes
the whole E2E suite. Here's what that takes.

## 1. Decide where it lives

- **Shares `examples/`** (`examples/<fw>/`, booted by `examples/vite.config.js`
  with `SPOTNOTE_FW=<fw>`) when its packages can sit next to React, Vue,
  Svelte 5 and Solid in one `node_modules`.
- **Its own package** (like `examples/svelte4/`: own `package.json` and
  `vite.config.js`, listed in `pnpm-workspace.yaml`) when it can't, e.g. another
  major of a framework already there.

## 2. Build the app

Copy the closest app and port it: Preact from `react/`, a Vue major from `vue/`.

- The same page: a `.hero` with an `h1`, cards with an `h3` from a loop, the
  placeholder `Bar` component. The E2E tests pick these through `APPS`.
- Use the framework's own Vite plugin, after `spotnote()` or before: order
  doesn't matter (stamping runs as `order: "pre"`).
- A shared app: add `<fw>` to `frameworkPlugin()` in `examples/vite.config.js`,
  a `dev:<fw>` script and the dependencies in `examples/package.json`.
- `pnpm install`, start it, check elements get `data-spotnote` and a note's
  prompt names the right file and line.

## 3. Does Spotnote itself need a change?

- JSX: `jsxFramework()` in `package/src/index.js` tells React from Solid by Vite
  plugin name, for the framework mark in the UI. A new JSX framework shows as
  "JSX" until it's added there and in `FRAMEWORKS` / the icons in
  `package/src/client/icons.js`.
- Another file type or compiler (not JSX, `.vue` or `.svelte`): stamping is new
  work in `package/src/index.js`. Stop and plan it with the user first.

## 4. Test it

- Add it to `APPS` in `e2e/playwright.config.js`: a free `port`, its `file`,
  `title`, `repeated` and `count`, and in `devServer()` how to start it (a
  shared app needs nothing; its own package, like svelte4, a branch).
- `pnpm test:e2e`: every test, in the new project too. A test that can't apply
  to it gets a `test.skip` with the reason.
- CI: add its build to the "Example builds" step in `.github/workflows/ci.yml`.

## 5. Docs

- `docs/content/docs/reference/framework-support.mdx`: its row to "Tested (<fw>
  <version>)", and a "Per framework" section if it has rules of its own.
- The framework lists in `docs/content/docs/index.mdx` (Works with) and
  `package/README.md`.
- `DEVELOPMENT.md`: its `dev` command and the examples layout.

Commit as `feat: <Framework> example app, tested end to end` (it's news for
users: one more framework that's tested).
