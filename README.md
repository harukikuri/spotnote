<br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/brand/spotnote-logo-dark.svg">
    <img src="docs/public/brand/spotnote-logo-light.svg" alt="Spotnote" width="180">
  </picture>
</p>

<br>

<p align="center">
  <a href="https://www.npmjs.com/package/spotnote"><img src="https://img.shields.io/npm/v/spotnote" alt="npm version"></a>
  <a href="https://github.com/harukikuri/spotnote/actions/workflows/e2e.yml?query=branch%3Amain"><img src="https://github.com/harukikuri/spotnote/actions/workflows/e2e.yml/badge.svg?branch=main" alt="E2E tests"></a>
</p>

**[Spotnote](https://spotnote-weld.vercel.app)** is a Vite plugin for UI feedback to coding agents. Click any element in your running app, write what should change, and hand your agent its exact file, line and column.



## Features

- **Exact spot.** Your UI feedback points to the exact file, line and column in your source code, so your agent doesn't have to search for it.
- **Any Vite framework.** React, Vue, Svelte, Solid, Astro, and so on.
- **Zero imports.** Nothing to import in your app code.
- **Production stays clean.** Spotnote runs only in `vite dev`, and in [staging builds](https://spotnote-weld.vercel.app/guides/staging) you turn it on for.
- **Everything is local.** No account, no cloud.

## Requirements

- Vite 5 or later

## Install

```bash
npm install -D spotnote
```

## Usage

```ts
// vite.config.ts
import spotnote from "spotnote";

export default defineConfig({
  plugins: [react(), spotnote()],
});
```

Start your dev server and click the launcher in the bottom-left corner. Click an element, type what should change and press `Enter`. The prompt is on your clipboard: paste it into Claude Code, Cursor, Codex or any chat.

## Output

The prompt Spotnote copies for a note, ready to paste into your agent:

````markdown
## Request
Make the padding bigger

## Target
- file: components/ProductCard.jsx
- line: 7, column: 5
- used at: pages/Products.jsx:68 (<ProductCard> in Products)
- element: <div class="product">
- text: "shoes Aero Runner $120"
- instance: 1 of 12 rendered from this line (by DOM order) — target the one matching the text above

## Source path (outer → inner)
App > Products > ProductCard

## Current computed styles
  padding: 16px
  margin: 0px
  color: rgb(26, 26, 26)
  background: rgba(0, 0, 0, 0)
  font-size: 16px
  font-weight: 400
  border-radius: 12px
````

Every field is explained in [Prompt Format](https://spotnote-weld.vercel.app/reference/prompt-format).

## MCP

Skip the copy and paste: your agent picks up notes as you write them.

```bash
claude mcp add --scope user spotnote -- npx -y spotnote-mcp
```

Then ask your agent: `Watch my Spotnote notes.` Codex, Cursor and Gemini CLI.

<br />

https://github.com/user-attachments/assets/87789868-c3e4-4eee-b340-6243ed4c4d0d

_With [MCP](https://spotnote-weld.vercel.app/guides/mcp) connected: click a button, ask for a pill shape, and **Claude Code picks up the note, makes the change and replies on it**. You never leave the browser._

## Docs

Full documentation is [here](https://spotnote-weld.vercel.app)

## License

MIT
