---
name: docs-update
description: Update the Spotnote docs site (docs/) after a change users can see. Finds the pages a code change touches, fixes links to renamed headings, retakes screenshots, and checks the docs build. Use after changing the UI, the prompt, the plugin options or the MCP tools, or when the user asks to update the docs.
---

# Update the docs

The docs are a Fumadocs site: pages in `docs/content/docs/*.mdx`, images in
`docs/public/`. Search is built from the pages at build time: there's nothing to
update for it.

## 1. Find the pages

Start from what changed (`git diff`, or the commits since the docs last changed):

| Code | Page (under `docs/content/docs/`) |
| --- | --- |
| `client/inspector.js`: picking, `Esc`, Alt | `guides/picking-elements.mdx` |
| `client/inspector.js`: the note panel, pins, several elements | `guides/notes.mdx` |
| `client/notes-list.js` | `guides/notes.mdx` (Delete notes, The notes list) |
| `client/settings-menu.js`, `client/settings.js` | `guides/settings.mdx` |
| `client/prompt.js` | `reference/prompt-format.mdx` |
| `client/open-file.js` | `guides/settings.mdx` (Open files in) |
| `client/launcher.js` | `getting-started/quick-start.mdx`, `guides/picking-elements.mdx` |
| `src/index.js` options, warnings | `reference/plugin-api.mdx` |
| `src/plugin.cjs`, stamping per framework | `reference/framework-support.mdx`, `concepts.mdx` |
| `mcp/src/tools.js` | `guides/mcp.mdx` (MCP Tools) |
| `mcp/src/store.js`, localStorage keys | `reference/storage.mdx` |
| Something it can't do | `limitations.mdx`, `faq.mdx` |

Also search for the old wording, since a name can be on more pages than the table
shows: `grep -rn "Old name" docs/content README.md package/README.md mcp/README.md`.

## 2. Write the change

- Match the page: short sentences, the UI's own words in **bold**, keys in
  backticks (`Shift`+click), steps as a numbered list.
- UI buttons drawn inline: `<PanelButton icon="trash" />`, `<LauncherItem icon="notes" />`,
  `<SendButton label="Add" />`, `<PinIcon n={1} />` (see `docs/components/`).
- A new page goes in its folder's `meta.json` (`pages`, in order), with
  `title` and `description` in its frontmatter. The description shows in the
  page header and in search results.

## 3. Fix links to renamed headings

A heading's anchor is its text, lowercased, spaces as `-`: `## Coding agent` is
`#coding-agent`. When you rename or remove a heading:

```bash
grep -rn "#old-anchor" docs/content README.md package/README.md mcp/README.md
```

Fix each link, and its text if it names the heading (`Settings → MCP`).

## 4. Retake screenshots that show the change

Find them: `grep -n 'src="/' docs/content/docs/<page>.mdx`, then look at each
image the change is visible in. Retake those; leave the rest.

1. Start the React example: `pnpm dev` (http://localhost:5173).
2. Copy `screenshot.mjs` (next to this file) into `e2e/`, and change its `stage()`
   to set up what the image shows. Keep what the old image showed (the same notes,
   the same page) so only the change differs.
3. `(cd e2e && node _shot.mjs ../docs/public/<name>.png) && rm e2e/_shot.mjs`
4. Look at the result. Set the `<img>`'s `width` to the one the script prints,
   and update its `alt` if what it shows changed.

Videos (`*.mp4`) are recorded by hand: if one shows the change, tell the user
rather than retaking it.

## 5. Check

```bash
pnpm --filter @spotnote/docs build
```

It must pass (CI builds it too). Then open the changed pages on
`pnpm --filter @spotnote/docs dev` (http://localhost:3000) if anything about their
layout changed.

Commit the docs with the code change they describe, or as `docs: …` on their own.
