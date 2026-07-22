# Spotnote

A dev-only tool: click an element in your running app, write a note, and get a
ready-to-paste prompt with the **exact source location** copied to your
clipboard — hand it to any local coding agent (Claude Code / Cursor / Codex).

A compile-time Babel plugin stamps `data-spotnote="file:line:column"` onto host
elements; a framework-agnostic client picker reads it back on click. No server,
no persistence — just the picker and the clipboard.

## Run

From the repo root — the demo apps live in the sibling `playground/` package and
consume this plugin via the `spotnote` workspace link:

```bash
pnpm install
pnpm dev                                    # React demo
pnpm --filter spotnote-playground dev:solid # Solid demo
```

Open the printed URL. Toggle **Inspect** in the launcher (bottom-left) or **hold
`Alt`**, then hover and click an element.

## Use in your app

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import spotnote from "spotnote";

export default defineConfig({
  plugins: [react(), spotnote()], // dev-only; auto-injects the picker
});
```

That's the whole setup — no client import, no Babel wiring. `spotnote()` is
`apply: "serve"`, so production builds are untouched.

## Flow

1. **Inspect** → hover shows an outline + `tag .class (file:line)` label.
2. **Click** an element → a panel opens with the source label and a note input.
3. **Type** an instruction → **Copy for agent** (or Enter) copies a prompt like:

   ```
   Edit the source for the UI element below to apply the request.

   ## Request
   make the padding bigger

   ## Target
   - file: pages/Products.jsx
   - line: 12, column: 4
   - element: <button class="chip">
   - text: "shoes"

   ## Current computed styles
     padding: 6px 12px
     …
   ```

   …and drops a **pin** on the element, then exits inspect mode.
4. **Paste** into your agent. It has the exact file/line + styles + your note.
5. **Click the pin** anytime to reopen/edit the note (🗑 removes it).

## What to try

- **Pages / query strings**: navigate Home · Products · About; the Products
  filters push `?category=&sort=` — pick elements across route changes.
- **Scroll**: pages are tall; pins and the open note panel follow the element as
  you scroll.
- **Repeated elements**: the products grid renders many identical cards — each
  gets a distinct id (`data-spotnote` + occurrence index), so notes don't collide and
  the prompt names the exact instance.
- **Component boundary**: cards come from `components/ProductCard.jsx`, so their
  stamps point there — not where they're used.
- **HMR**: edit a page; class-only changes keep pins anchored, line shifts re-bind.
- **Launcher**: drag it, minimize (+ ↔ ×), open the Notes list of your pins.

## Layout

```
src/                  # THE TOOL (this package)
  index.js            # the Vite plugin: spotnote() — transform + client injection
  plugin.cjs          # Babel visitor — stamps data-spotnote (host-only, project-relative)
  client/             # browser runtime (auto-injected by the plugin in dev)
    inspector.js      # picking, panel, pins, clipboard prompt, HMR re-bind
    launcher.js       # compact draggable/minimizable rail
    ui.js             # buttons, icons, theme tokens
```

The demo apps live in the sibling `../playground/` package (React, Solid, …),
which imports `spotnote` via the workspace link — see the repo root `DEVELOPMENT.md`.

## Frameworks

The client is framework-agnostic (it reads `data-spotnote` off the DOM). Stamping
runs `enforce: "pre"`, before the framework compiler: JSX via a standalone Babel
pass (no React dependency), and Vue `.vue` templates via the app's own
`vue/compiler-sfc`. So:

| Framework | Support | How |
| --- | --- | --- |
| React (Vite) | ✅ built-in | `plugins: [react(), spotnote()]` |
| Solid / Preact / Qwik (Vite) | ✅ same plugin | `plugins: [framework(), spotnote()]` — the JSX pass runs before the framework's compiler |
| Vue (Vite) | ✅ built-in | `plugins: [spotnote(), vue()]` — stamps `<template>` host elements; borrows `vue/compiler-sfc` from your app, no extra dep |
| Next.js | ⏳ planned | not Vite — register `src/plugin.cjs` via `babel.config.js` and load the client manually |

The only framework-specific work left is **non-Vite bundlers** (Next). The
`plugin.cjs` visitor is reusable as-is there.
