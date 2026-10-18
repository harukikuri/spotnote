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

<!-- Demo: drop docs/public/demo.mp4 into this file in GitHub's editor, and replace this comment with the URL it gives. -->


https://github.com/user-attachments/assets/87789868-c3e4-4eee-b340-6243ed4c4d0d



## Features

- **No more guessing.** The prompt names the file, line and column where the element is written, so your agent doesn't search for it.
- **Any Vite framework.** React, Vue, Svelte, Solid, Astro, and so on.
- **Stay in the browser.** With MCP, your agent picks up your notes automatically.
- **Zero imports.** Nothing to import in your app code.
- **Production stays clean.** Spotnote runs only in `vite dev`.
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
