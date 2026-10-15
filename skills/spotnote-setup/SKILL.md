---
name: spotnote-setup
description: Set up Spotnote in a Vite app. Installs the spotnote dev dependency, adds spotnote() to the Vite config, and optionally connects this coding agent to spotnote-mcp. Use when the user asks to install, add, set up or connect Spotnote.
---

# Set up Spotnote

Spotnote is a dev-only Vite plugin: the developer clicks an element in their running app, writes what should change, and the note names the exact file, line and column. Setup is two edits to the app (a dev dependency and one line in the Vite config), plus, if the user wants it, connecting their agent through MCP.

Never change the app's own code: nothing is imported in it.

## 1. Find the Vite app

1. Look for `vite.config.ts`, `.js`, `.mjs`, `.mts` or `.cjs`. In a monorepo there can be several: if more than one app has one, ask which app to set up.
2. No Vite config? Stop and tell the user Spotnote needs Vite. If there's a `next.config.*`, say that Next.js isn't supported (it doesn't use Vite).
3. Check the app's Vite version (its `package.json`, or `node_modules/vite/package.json`). Spotnote needs Vite 5 or later.
4. Note the framework from the config's plugins: React (`@vitejs/plugin-react` or `-swc`), Solid (`vite-plugin-solid`), Vue (`@vitejs/plugin-vue`) or Svelte (`@sveltejs/vite-plugin-svelte`). Others, such as Preact, are untested but use the same JSX stamping.

## 2. Install the package

In the app's folder, with the package manager its lockfile shows:

| Lockfile | Command |
| --- | --- |
| `pnpm-lock.yaml` | `pnpm add -D spotnote` |
| `yarn.lock` | `yarn add -D spotnote` |
| `bun.lock` or `bun.lockb` | `bun add -d spotnote` |
| `package-lock.json`, or none | `npm install -D spotnote` |

In a pnpm or yarn workspace, install it in the app's package, not the repository root.

## 3. Add the plugin

Add `spotnote()` to `plugins` in the Vite config. Anywhere in the array works; order doesn't matter.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import spotnote from 'spotnote';

export default defineConfig({
  plugins: [react(), spotnote()],
});
```

- Keep the file's style: its quotes, semicolons and import order.
- If it's already there, don't add it twice.
- For a config that's a function (`defineConfig(({ mode }) => ({ … }))`) or built with `mergeConfig`, add it to the `plugins` array that the dev server uses.
- It only runs in `vite dev`; `vite build` leaves it out, so production needs no condition.

## 4. Connect the agent (ask first)

Ask whether the user wants their agent to pick up notes as they write them (spotnote-mcp), instead of copying each note's prompt by hand. If yes, add the server once, for the agent you are:

| Agent | How |
| --- | --- |
| Claude Code | `claude mcp add --scope user spotnote -- npx -y spotnote-mcp` |
| Codex | `codex mcp add spotnote -- npx -y spotnote-mcp` |
| Cursor | In `~/.cursor/mcp.json`, under `mcpServers`: `"spotnote": { "command": "npx", "args": ["-y", "spotnote-mcp"] }` |
| Gemini CLI | In `~/.gemini/settings.json`, under `mcpServers`: the same entry as Cursor |

Merge into an existing JSON config; don't overwrite the user's other servers. A server added now only shows up in a new agent session, so tell the user to start one.

Port 4848 is the default. If it's taken, the same free port goes in both places: the agent (`-e SPOTNOTE_PORT=4900` in the Claude Code command, or `"env": { "SPOTNOTE_PORT": "4900" }` next to `"args"`), and the dev server (`SPOTNOTE_PORT=4900 pnpm dev`).

## 5. Tell the user what's next

Say what you changed (the dependency, the config file), then:

1. Start (or restart) the dev server and open the app: the Spotnote launcher appears on the page.
2. Open it, click an element, write a note and press Enter. Without an agent connected, the prompt is copied to the clipboard.
3. With the agent connected: in a new session, ask it `Watch my Spotnote notes.` Settings → Coding agent in the launcher shows **Connected**.

Good to know, if it comes up: only `.jsx` and `.tsx` files are stamped for JSX (not JSX in `.js` or `.ts`), and elements rendered by dependencies point at the nearest element in the user's own code. Docs: https://spotnote-weld.vercel.app
