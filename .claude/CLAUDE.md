@../AGENTS.md

## Claude Code

- `/release` (`.claude/skills/release/`) cuts a new version: bump, CI, tag, npm.
- `/docs-update` (`.claude/skills/docs-update/`) brings `docs/` up to date after a
  change users see: pages, renamed-heading links, screenshots, the docs build.
- `/examples-repro` turns a bug report into a failing E2E test in the example apps,
  before the fix.
- `/examples-sync`: after editing `examples/`, what depends on their markup
  (the E2E app table, line numbers, screenshot steps).
- `/examples-new-framework` adds an example app for another framework, tested
  end to end and marked so in the docs.
- `.mcp.json` runs this repo's own `mcp/src/cli.js` as the `spotnote` server, so
  notes written on `pnpm dev` reach this session with local MCP changes in.
- The plugin reads `package.json` once, when Vite starts: restart `pnpm dev` to
  see a new version in Settings.
