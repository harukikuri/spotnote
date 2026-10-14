# spotnote-mcp

The MCP server for [Spotnote](https://www.npmjs.com/package/spotnote). Your
coding agent picks up the notes you write on your running app, asks you on the
note when a request is unclear, and marks it done.

You don't run it yourself: your agent starts it.

## Add it to your agent

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

Your app needs the `spotnote` Vite plugin; its launcher connects on its own.

## Tools

| Tool | What it does |
| --- | --- |
| `watch_notes` | Waits up to 50 seconds for notes that need the agent (new notes and your replies), then returns them. |
| `list_notes` | Returns every open note. |
| `reply_note` | Writes a message to you on a note, usually a question. |
| `dismiss_note` | Closes a note without making the change, with the reason. |
| `resolve_note` | Marks a note done, with a short summary of the change. |

## Port

It listens on `127.0.0.1:4848` only. If that port is taken, set `SPOTNOTE_PORT`
to the same free port in your agent's MCP config and in your dev server's
environment.

Notes are saved in `~/.spotnote/`. Nothing leaves your machine.

## License

MIT
