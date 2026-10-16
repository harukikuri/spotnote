# Spotnote

**Point, don't describe.** Click any element in your running Vite app, write
what should change, and hand your coding agent its exact file, line and column —
no more guessing, no more grepping.

**Docs:** https://spotnote-weld.vercel.app

## Install

```bash
npm install -D spotnote
```

Add `spotnote()` to `plugins`. Anywhere in the array works.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import spotnote from 'spotnote';

export default defineConfig({
  plugins: [react(), spotnote()],
});
```

Nothing to import in your app code. Spotnote runs only in `vite dev`; `vite build`
and Vitest don't include it.

## Use

1. Start your dev server and open your app.
2. Click the launcher in the bottom-left corner (or hold `Alt` / `⌥ Option`),
   then click an element.
3. Type what should change and press `Enter`. The note is saved, a numbered pin
   appears on the element, and a prompt like this is on your clipboard:

   ```markdown
   ## Request
   Make the padding bigger

   ## Target
   - file: pages/Products.jsx
   - line: 47, column: 11
   - element: <button class="chip chip-active">
   - text: "all"

   ## Current computed styles
     padding: 6px 12px
     …
   ```

4. Paste it into Claude Code, Cursor, Codex or any chat.

## Connect your agent (MCP)

Skip the copy and paste. With `spotnote-mcp`, your agent picks up notes as you
write them, asks on the note when a request is unclear, and marks it done.

```bash
# Claude Code
claude mcp add --scope user spotnote -- npx -y spotnote-mcp

# Codex
codex mcp add spotnote -- npx -y spotnote-mcp
```

For Cursor (`~/.cursor/mcp.json`) or Gemini CLI (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "spotnote": { "command": "npx", "args": ["-y", "spotnote-mcp"] }
  }
}
```

Then ask your agent: `Watch my Spotnote notes.`

## Frameworks

Vite 5 or later (tested on 5, 6, 7 and 8).

| Framework | Status |
| --- | --- |
| React | Tested (React 17, 18, 19) |
| Solid | Tested (Solid 1.9) |
| Vue | Tested (Vue 3.2, 3.4, 3.5) |
| Svelte | Tested (Svelte 4, 5) |
| Astro | Tested (Astro 5, 6, 7) |
| Preact, other JSX | Untested |
| SvelteKit, Nuxt, React Router, SolidStart | Works (checked by hand) |
| Next.js | Not supported (not Vite) |

## How it works

While Vite compiles your code, the plugin stamps every host element written in
your `.jsx`, `.tsx`, `.vue`, `.svelte` and `.astro` files with its source location:

```html
<button data-spotnote="components/ProductCard.jsx:12:5" data-spotnote-name="ProductCard">
```

A small client, injected into the page Vite serves, reads the stamp back when
you click. Notes live in your browser's `localStorage`, and in `~/.spotnote/`
while spotnote-mcp runs. Nothing leaves your machine.

## License

MIT
