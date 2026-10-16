---
name: examples-sync
description: After changing an example app's markup (examples/), update what depends on it — the E2E app table, tests that pick by line, the docs screenshot steps — so nothing breaks or goes stale. Use after editing anything under examples/.
---

# Keep things in step with the examples

The example apps are the E2E fixtures and the docs' screenshot set. Their markup
is read in four other places.

## 0. The other versions of the app

Each framework has an app per version (DEVELOPMENT.md, "Examples layout"). Edit
the newest (`react19`, `vue35`, `solid19`, `astro7`), then copy it into the
others:

```bash
node examples/sync.mjs
```

Svelte 4 and 5 are written differently: a change to one goes into the other by
hand. A file one version needs to keep different (React 17's `main.jsx`) is
listed as its own in `sync.mjs`.

## 1. The E2E app table

`e2e/playwright.config.js` → `ALL` (and the shapes above it): per app, what the
tests pick.

| Field | Means | Check after a change |
| --- | --- | --- |
| `file` | where `title` is written, relative to the app's root | the title still lives in that file |
| `title` | a selector for one element, the page's title | it still matches exactly that element, first |
| `repeated` | an element rendered several times from one line | it's still one line, in a loop |
| `count` | how many times `repeated` renders | the new number, if the list changed |

## 2. Tests that read the source

- The "saving the file" test in `e2e/spotnote.spec.js` writes to `app.file` and
  expects nothing above the title to move: keep the title's line stable.
- Tests and docs that name a line (`Home.jsx:17`) or a `data-spotnote` value:
  `grep -rn "Home.jsx:\|Products.jsx:\|data-spotnote=" e2e .claude docs/content`.

## 3. The docs

- Screenshots in `docs/public/` show the React example. A changed page looks
  different in its screenshots only if the change is in the shot; if so, retake
  them (`docs-update` skill). Line numbers in a chip (`Home.jsx:17`) going stale is
  not a reason to retake one on its own.
- The steps that set screenshots up pick elements by `data-spotnote="pages/…:line:col"`:
  if you moved those lines, update the selectors in your copy of `screenshot.mjs`.

## 4. Check

```bash
node examples/sync.mjs --check                       # the copies match
pnpm test:e2e                                        # every app
pnpm --filter "./examples/**" build                  # every app builds
```

CI runs the same builds (`.github/workflows/ci.yml`). Also open the changed app
(`pnpm dev`, …) and look: it's the first thing people see of Spotnote.
