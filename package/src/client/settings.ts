// Settings from the launcher's gear menu, kept per browser in localStorage.
//   accent: a key of ACCENTS (ui.ts)
//   theme:  "system" | "light" | "dark" — Spotnote's own UI, not the page's
//   editor: a key of EDITORS — where file links in the agent's messages open
const KEY = "data-spotnote-settings";
export interface Settings {
  accent: string;
  theme: "system" | "light" | "dark";
  editor: string;
}
const DEFAULTS: Settings = { accent: "yellow", theme: "light", editor: "auto" };

// "auto" asks the dev server to open the file in the editor that's running.
// The others open it through the editor's own URL, straight from the browser:
// no running editor, CLI or environment variable needed.
export const EDITORS: Record<string, { name: string; scheme?: string }> = {
  auto: { name: "Auto" },
  vscode: { name: "VS Code", scheme: "vscode" },
  cursor: { name: "Cursor", scheme: "cursor" },
  windsurf: { name: "Windsurf", scheme: "windsurf" },
  zed: { name: "Zed", scheme: "zed" },
};

let current = { ...DEFAULTS };
try {
  const saved: Partial<Settings> = JSON.parse(localStorage.getItem(KEY) || "{}");
  current = { ...DEFAULTS, ...saved };
  if (current.accent === "cyan") current.accent = "blue"; // renamed with the palette
} catch {
  /* ignore */
}
const listeners: ((s: Settings) => void)[] = [];

export function getSettings(): Settings {
  return current;
}

export function setSetting<K extends keyof Settings>(name: K, value: Settings[K]): void {
  current = { ...current, [name]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb(current));
}

export function onSettings(cb: (s: Settings) => void): void {
  listeners.push(cb);
}
