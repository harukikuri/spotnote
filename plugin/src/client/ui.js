// Small UI kit (buttons + icon buttons) as plain JS. Colours are CSS variables
// on the shadow host, so the accent and light/dark theme can change live (see
// applyLook and the Settings menu).
import { T, CSS } from "./styles.js";

// Accent presets for the Settings menu: the brand yellow, then system-style
// colours at full strength, in hue order. `ink` is the text on the accent (dark,
// or white on violet: each ≥ 5:1); `deep` is the hue dark enough to read as
// text on the light theme (≥ 4.5:1 on white).
// `fold` is the Spotnote mark's folded corner in that colour (the mark itself
// takes `accent`); yellow's are the brand's own (docs/public/brand/spotnote-mark-yellow.svg).
export const ACCENTS = {
  yellow: { name: "Yellow", accent: "#ffd84d", ink: "#1a1600", deep: "#8a6a00", fold: "#d4a817" },
  orange: { name: "Orange", accent: "#ff9500", ink: "#1f1100", deep: "#b25000", fold: "#cc7700" },
  pink: { name: "Pink", accent: "#ff375f", ink: "#1f0008", deep: "#d70f45", fold: "#cc2c4c" },
  violet: { name: "Violet", accent: "#5e5ce6", ink: "#ffffff", deep: "#5e5ce6", fold: "#4b4ab8" },
  blue: { name: "Blue", accent: "#0a84ff", ink: "#00142b", deep: "#0062cc", fold: "#086acc" },
  green: { name: "Green", accent: "#30c85e", ink: "#001f0b", deep: "#1b7f3b", fold: "#26a04b" },
};

// All Spotnote UI lives in one shadow root, so the host page's CSS can't restyle
// it (and ours can't leak out). The host is pinned at the document origin:
// position:absolute children use document coords, position:fixed the viewport.
// It hangs off <html>, not <body>, so a positioned body can't offset it.
let shadow = null;
export function uiRoot() {
  if (shadow) return shadow;
  const host = document.createElement("spotnote-root");
  host.setAttribute("data-spotnote-ui", "");
  host.style.cssText = "all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647";
  shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = CSS;
  shadow.append(style);
  document.documentElement.append(host);
  return shadow;
}

// Apply the accent preset and theme ("system" | "light" | "dark") to the host.
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
let look = null;
export function applyLook(next) {
  if (!look) darkQuery.addEventListener("change", () => applyLook(look));
  look = next;
  const host = uiRoot().host;
  const a = ACCENTS[look.accent] ?? ACCENTS.yellow;
  const theme = look.theme === "system" ? (darkQuery.matches ? "dark" : "light") : look.theme;
  host.setAttribute("data-theme", theme);
  host.style.setProperty("--sn-accent", a.accent);
  host.style.setProperty("--sn-accent-rgb", [1, 3, 5].map((i) => parseInt(a.accent.slice(i, i + 2), 16)).join(","));
  host.style.setProperty("--sn-ink", a.ink);
  host.style.setProperty("--sn-accent-text", theme === "light" ? a.deep : a.accent);
  // The launcher's Spotnote mark wears the accent too.
  host.style.setProperty("--sn-mark", a.accent);
  host.style.setProperty("--sn-mark-fold", a.fold);
}

export function createIconBtn({ svg, title, parent, onClick, size = 28 }) {
  const b = document.createElement("button");
  b.setAttribute("data-spotnote-ui", "");
  if (title) b.title = title;
  b.style.cssText = [
    "background:none",
    "border:none",
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:6px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "cursor:pointer",
    `color:${T.textIcon}`,
    "padding:0",
    "flex-shrink:0",
    "transition:background .14s,color .14s",
  ].join(";");
  b.innerHTML = svg; // hardcoded SVG constants, not user input

  b.addEventListener("mouseenter", () => {
    if (b.hasAttribute("data-active")) return; // keep active styling on hover
    b.style.background = "var(--sn-hover-strong)";
    b.style.color = "var(--sn-text-strong)";
  });
  b.addEventListener("mouseleave", () => {
    if (b.hasAttribute("data-active")) return;
    b.style.background = "none";
    b.style.color = T.textIcon;
  });
  if (onClick) b.addEventListener("click", onClick);

  if (parent) parent.appendChild(b);
  return b;
}

// A new element with a class, appended to `parent`.
export function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.append(e);
  return e;
}
