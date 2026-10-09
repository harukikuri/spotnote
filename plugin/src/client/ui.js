// Small UI kit (buttons + icon buttons) as plain JS, with a fixed dark theme +
// indigo accent.

export const T = {
  accent: "#6366f1",
  accentRgb: "99,102,241",
  bg: "#1a1a1a",
  bgInput: "#141414",
  border: "#333",
  borderSubtle: "#262626",
  text: "#ededed",
  textMuted: "#888",
  textIcon: "#999",
  font: "system-ui,-apple-system,sans-serif",
  mono: "ui-monospace,SFMono-Regular,Menlo,monospace",
};

// Stylesheet for everything inside the shadow root. The UI was designed under a
// border-box reset, so it's restated here rather than inherited from the page.
const CSS = [
  "*,*::before,*::after{box-sizing:border-box}",
  "@keyframes dl-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
  "[data-spotnote-input]:empty::before{content:attr(data-placeholder);color:#666;pointer-events:none}",
].join("\n");

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

export function createButton({ label, variant = "primary", parent, onClick }) {
  const b = document.createElement("button");
  b.setAttribute("data-spotnote-ui", "");
  const s = [
    "border:none",
    "cursor:pointer",
    "user-select:none",
    "font-family:" + T.font,
    "font-size:13px",
    "padding:5px 12px",
    "border-radius:6px",
    "transition:opacity .14s,background .14s,color .14s",
  ];
  if (variant === "primary") s.push(`background:${T.accent}`, "color:#fff");
  else if (variant === "secondary") s.push("background:none", `color:${T.textMuted}`);
  b.style.cssText = s.join(";");
  b.textContent = label;

  if (onClick) b.addEventListener("click", onClick);

  b.addEventListener("mouseenter", () => {
    if (b.disabled) return; // callers may disable the button via the DOM property
    if (variant === "primary") b.style.opacity = "0.85";
    else if (variant === "secondary") b.style.color = T.text;
  });
  b.addEventListener("mouseleave", () => {
    b.style.opacity = b.disabled ? "0.4" : "1";
    if (variant === "secondary") b.style.color = T.textMuted;
  });

  if (parent) parent.appendChild(b);
  return b;
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
    b.style.background = "rgba(255,255,255,0.08)";
    b.style.color = "#fff";
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

export const ICONS = {
  copy:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  close:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  check:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
};
