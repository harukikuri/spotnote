# Spotnote

Spotnote is a **dev-only tool for Vite apps**: click an element in your running
app, write a note, and get a ready-to-paste prompt with the element's **exact
source location** (`file:line:column`) plus its tag / classes / computed styles —
hand it to a local coding agent (Claude Code / Cursor / Codex). No server, no
persistence; it copies to the clipboard.

## Repository structure

A pnpm workspace with three packages:

- `plugin/` — the Spotnote Vite plugin + browser picker (the product, published
  as `spotnote`). Ships raw source; no build step.
- `playground/` — framework demo apps (React / Solid / Vue) that consume the
  plugin via `spotnote: workspace:*`, exactly as a real app would.
- `docs/` — documentation site (Fumadocs / Next.js).

> An earlier version of Spotnote was a server + dashboard + AI-agent product.
> That `server/` package and its root docs were removed; the history is at
> commit `f630394` if you ever need it.

## Quick reference

```bash
pnpm install                             # link workspace + install deps
pnpm dev                                 # React playground (hold Alt, or toggle Inspect)
pnpm --filter spotnote-playground dev:solid   # Solid playground
```

The playground picks its framework via `SPOTNOTE_FW` (`react` | `solid` | `vue`).

## How it works

- `plugin/src/index.js` exports the Vite plugin `spotnote()` (`apply: "serve"`).
  It stamps `data-spotnote="file:line:column"` (`enforce: "pre"`) on host
  elements — JSX via a standalone Babel pass, `.vue` templates via the app's
  `vue/compiler-sfc` — and auto-injects the browser picker client
  (`plugin/src/client/`) via `transformIndexHtml`. The
  playground consumes it through the `spotnote` workspace link, so dev exercises
  the real install path.
- The picker: pick an element → hover label + panel → write a note → copy an
  agent-ready prompt; pins persist and reopen. See `plugin/README.md`.
- Production builds are untouched (`apply: "serve"`) — no `data-spotnote` leaks.

## Conventions

- **Commits**: Conventional Commits — `type(scope): description`.
- **Node**: see `.nvmrc`.
- **Scope**: React / Solid / Vue on Vite today (JSX via Babel, `.vue` via `vue/compiler-sfc`); Next.js (non-Vite) is on the roadmap.
