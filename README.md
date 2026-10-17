<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/brand/spotnote-logo-dark.svg">
  <img src="docs/public/brand/spotnote-logo-light.svg" alt="Spotnote" width="180">
</picture>

<br>

[![npm version](https://img.shields.io/npm/v/spotnote)](https://www.npmjs.com/package/spotnote)
[![E2E tests](https://github.com/harukikuri/spotnote/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/harukikuri/spotnote/actions/workflows/e2e.yml?query=branch%3Amain)

**[Spotnote](https://spotnote-weld.vercel.app)** is a Vite plugin for UI feedback to coding agents. Click any element in your running app, write what should change, and hand your agent its exact file, line and column.

<!-- Demo: drop docs/public/demo.mp4 into this file in GitHub's editor, and replace this comment with the URL it gives. -->


https://github.com/user-attachments/assets/87789868-c3e4-4eee-b340-6243ed4c4d0d



## Features

- **The exact spot.** The prompt names the file, line and column where the element is written.
- **Any Vite framework.** React, Vue, Svelte, Solid, Astro, and so on.
- **Stay in the browser.** With MCP, your agent picks up your notes automatically.
- **Zero imports.** Nothing to import in your app code.
- **Production stays clean.** Spotnote runs only in `vite dev`.
- **Everything is local.** No account, no cloud.

## Requirements

- Vite 5 or later
- React, Vue, Svelte, Solid or Astro, or SvelteKit, Nuxt, React Router or SolidStart ([tested versions](https://spotnote-weld.vercel.app/reference/framework-support))

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

## MCP

Skip the copy and paste: your agent picks up notes as you write them.

```bash
claude mcp add --scope user spotnote -- npx -y spotnote-mcp
```

Then ask your agent: `Watch my Spotnote notes.` Codex, Cursor and Gemini CLI: see the [MCP guide](https://spotnote-weld.vercel.app/guides/mcp).

## Docs

Full documentation is [here](https://spotnote-weld.vercel.app)

## License

MIT
