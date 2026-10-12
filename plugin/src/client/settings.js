// Settings from the launcher's gear menu, kept per browser in localStorage.
//   accent: a key of ACCENTS (ui.js)
//   theme:  "system" | "light" | "dark" — Spotnote's own UI, not the page's
//   editor: a key of EDITORS — where file links in the agent's messages open
const KEY = "data-spotnote-settings";
const DEFAULTS = { accent: "yellow", theme: "dark", editor: "auto" };

// "auto" asks the dev server to open the file in the editor that's running.
// The others open it through the editor's own URL, straight from the browser:
// no running editor, CLI or environment variable needed.
export const EDITORS = {
  auto: { name: "Auto" },
  vscode: { name: "VS Code", scheme: "vscode" },
  cursor: { name: "Cursor", scheme: "cursor" },
  windsurf: { name: "Windsurf", scheme: "windsurf" },
  zed: { name: "Zed", scheme: "zed" },
};

let current = { ...DEFAULTS };
try {
  current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  if (current.accent === "cyan") current.accent = "blue"; // renamed with the palette
} catch {
  /* ignore */
}
const listeners = [];

export function getSettings() {
  return current;
}

export function setSetting(name, value) {
  current = { ...current, [name]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb(current));
}

export function onSettings(cb) {
  listeners.push(cb);
}
