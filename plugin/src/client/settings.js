// Settings from the launcher's gear menu, kept per browser in localStorage.
//   accent: a key of ACCENTS (ui.js)
//   theme:  "system" | "light" | "dark" — Spotnote's own UI, not the page's
const KEY = "data-spotnote-settings";
const DEFAULTS = { accent: "yellow", theme: "dark" };

let current = { ...DEFAULTS };
try {
  current = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
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
