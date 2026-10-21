// Opens a file the agent mentioned ("router.jsx:28", "src/App.jsx") in your
// editor, for file links in the page (client/open-file.ts). It's looked up
// against the Vite root, then the repository root (agents often work from
// there); only files inside the repository.
//   GET /__spotnote/open?path=&line=&column=  open it in the running GUI editor
//   GET /__spotnote/open?path=&resolve=1      just return its absolute path (the
//                                             page then opens it through vscode:// & co.)
// → 200 { file, editor? } · 200 { file, scheme } (the running editor's CLI
//   isn't installed: the page opens scheme://file/…) · 404 { error: "missing" }
//   · 409 { error: "no-editor" }
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import launchEditor from "launch-editor";
import guessEditor from "launch-editor/guess.js";
import type { ViteDevServer } from "vite";

// What launch-editor falls back to without a GUI editor: it would open inside
// the dev server's terminal, where it can't run. Better to say "no editor".
const TERMINAL_EDITORS = new Set(["vi", "vim", "nvim", "nano", "emacs", "pico", "ed", "micro", "hx", "helix"]);
// Editors that also open from a URL: used when their command-line tool isn't
// installed (VS Code's `code` often isn't), so the page opens the URL instead.
const EDITOR_SCHEMES: Record<string, string> = {
  code: "vscode",
  "code-insiders": "vscode-insiders",
  cursor: "cursor",
  windsurf: "windsurf",
  zed: "zed",
};

// Can `cmd` be run? (An absolute path that exists, or a name found on PATH.)
function runnable(cmd: string): boolean {
  if (path.isAbsolute(cmd)) return existsSync(cmd);
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  return (process.env.PATH || "")
    .split(path.delimiter)
    .some((dir) => exts.some((ext) => existsSync(path.join(dir, cmd + ext))));
}

// `root`: the Vite root; `top`: the repository's root.
export function serveOpenEditor(server: ViteDevServer, root: string, top: string): void {
  server.middlewares.use("/__spotnote/open", (req, res) => {
    const q = new URL(req.url ?? "", "http://x").searchParams;
    const reply = (status: number, body: Record<string, string>) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    const file = [root, top]
      .map((base) => path.resolve(base, q.get("path") || ""))
      .find((f) => (f === top || f.startsWith(top + path.sep)) && existsSync(f) && statSync(f).isFile());
    if (!file) return reply(404, { error: "missing" });
    if (q.get("resolve")) return reply(200, { file });
    const [editor] = guessEditor();
    if (!editor || TERMINAL_EDITORS.has(path.basename(editor))) return reply(409, { error: "no-editor" });
    if (!runnable(editor)) {
      const scheme = EDITOR_SCHEMES[path.basename(editor)];
      return scheme ? reply(200, { file, scheme }) : reply(409, { error: "no-editor" });
    }
    const at = [file, q.get("line"), q.get("column")].filter(Boolean).join(":");
    launchEditor(
      at,
      editor,
      (_, err) => void (err && server.config.logger.warn(`[spotnote] couldn't open ${at}: ${err}`)),
    );
    reply(200, { file, editor: path.basename(editor) });
  });
}
