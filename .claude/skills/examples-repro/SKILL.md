---
name: examples-repro
description: Reproduce a reported Spotnote bug in the example apps (examples/) and pin it down with a failing E2E test before fixing it. Use when the user reports a bug, pastes an issue, or says something "doesn't work" in their app.
---

# Reproduce a bug in the examples

Goal: a failing E2E test that shows the bug, in the example app closest to the
report. Then fix the code until it passes. Don't fix first: without the test you
can't tell the fix worked, or keep it working.

## 1. Read the report

Note what decides where it can happen:

- **Framework and version**: React, Solid, Vue, Svelte 5, Svelte 4 or Astro (each has an
  app in `examples/<fw>/`). Another JSX framework (Preact, …)? Use React's app: the
  same Babel pass stamps it.
- **The markup**: what kind of element (a component's root, a `.map()` item, a
  slot, an SVG, a conditional), and in which file type.
- **What they did**: clicked, Shift-clicked, edited the file (HMR), changed page,
  reloaded, with or without the agent connected (MCP).
- **What they expected, and what happened**: the prompt's text, a pin's place,
  the panel, an error in the console.

Missing something that changes where it can happen? Ask for it (one question)
before guessing.

## 2. Reproduce it by hand

1. Start the app: `pnpm dev` (React), `pnpm --filter spotnote-examples dev:solid`
   (`:vue`, `:svelte`), `pnpm dev:svelte4` or `pnpm dev:astro`.
2. Does the example already have markup like theirs? Use it. If not, add the
   smallest piece that has the shape from the report to an existing page (a new
   element, a component). Keep the examples' look: placeholder bars (`<Bar>`), no
   real content.
3. Drive it in a browser (Playwright from `e2e/`, as in `.claude/skills/docs-update/screenshot.mjs`)
   and see the bug happen.

Can't reproduce it? Say what you tried, and ask for the piece of their code or
the prompt Spotnote copied: don't fix a bug you haven't seen.

## 3. Write the failing test

- Put it in `e2e/spotnote.spec.js` (or `e2e/agent.spec.js` if the agent is part
  of it), named for the behavior: `"a note on a slotted element names the file it's written in"`.
- If it's about one framework only, skip the others in the test:
  `test.skip(app.name !== "vue", "Vue only: …")`.
- If you added markup that other frameworks have too, add it to each app, and
  pick it through a field on `APPS` in `e2e/playwright.config.js` (like `title`, `repeated`).
- Run it and check it fails for the reported reason, not a typo:
  `pnpm --filter spotnote-e2e exec playwright test -g "<name>" --project <fw>`.

## 4. Fix, then run everything

Fix the code under `package/` or `mcp/`. Then the test passes, and so does the rest:
`pnpm lint && pnpm test && pnpm test:e2e`.

Markup you added to the examples can move line numbers that other things rely
on: see the `examples-sync` skill.

Commit the test with the fix, as `fix: …` written for users (it goes in the
release notes).
