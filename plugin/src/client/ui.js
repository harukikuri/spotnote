// Small UI kit (buttons + icon buttons) as plain JS. Colours are CSS variables
// on the shadow host, so the accent and light/dark theme can change live (see
// applyLook and the Settings menu).

export const T = {
  accent: "var(--sn-accent)",
  accentRgb: "var(--sn-accent-rgb)",
  accentInk: "var(--sn-ink)", // text/icons drawn on the accent
  accentText: "var(--sn-accent-text)", // the accent as text on the theme's surfaces
  bg: "var(--sn-bg)",
  bgInput: "var(--sn-bg-input)",
  border: "var(--sn-border)",
  borderSubtle: "var(--sn-border-subtle)",
  text: "var(--sn-text)",
  textMuted: "var(--sn-muted)",
  textIcon: "var(--sn-icon)",
  font: "system-ui,-apple-system,sans-serif",
  mono: "ui-monospace,SFMono-Regular,Menlo,monospace",
};

// Accent presets for the Settings menu. All are light enough for dark `ink` on
// top; `deep` is the same hue dark enough to read as text on the light theme.
export const ACCENTS = {
  yellow: { name: "Yellow", accent: "#ffd84d", ink: "#1a1600", deep: "#8a6a00" },
  pink: { name: "Pink", accent: "#ff4d94", ink: "#2a0016", deep: "#be185d" },
  cyan: { name: "Cyan", accent: "#1ccfe8", ink: "#00222b", deep: "#0e7490" },
  green: { name: "Green", accent: "#3ddc84", ink: "#00230f", deep: "#15803d" },
  orange: { name: "Orange", accent: "#ff9419", ink: "#2a1400", deep: "#c2410c" },
  violet: { name: "Violet", accent: "#a07cff", ink: "#160a33", deep: "#6d28d9" },
};

// Theme surfaces. Dark is the original look; light mirrors it.
const THEMES = {
  dark: {
    bg: "#1a1a1a", "bg-input": "#141414", border: "#333", "border-subtle": "#262626",
    text: "#ededed", muted: "#888", icon: "#999", sub: "#a1a1aa", placeholder: "#666",
    hover: "rgba(255,255,255,.06)", "hover-strong": "rgba(255,255,255,.08)", "text-strong": "#fff",
    glass: "rgba(24,24,28,.74)", "glass-border": "rgba(255,255,255,.10)", "glass-inset": "rgba(255,255,255,.06)",
    "glass-text": "#f2f2f3", "glass-hover": "rgba(44,44,50,.86)", track: "#a1a1aa",
    "lost-num": "#3f3f46", lost: "#fb923c", shadow: "rgba(0,0,0,.5)", pop: "rgba(24,24,28,.97)",
    "fw-react": "#61dafb", "fw-solid": "#76b3e1", "fw-vue": "#42b883", "fw-svelte": "#ff3e00", "fw-jsx": "#a1a1aa",
  },
  light: {
    bg: "#ffffff", "bg-input": "#f4f4f5", border: "#e4e4e7", "border-subtle": "#f0f0f1",
    text: "#18181b", muted: "#71717a", icon: "#71717a", sub: "#71717a", placeholder: "#a1a1aa",
    hover: "rgba(0,0,0,.04)", "hover-strong": "rgba(0,0,0,.06)", "text-strong": "#000",
    glass: "rgba(255,255,255,.8)", "glass-border": "rgba(0,0,0,.08)", "glass-inset": "rgba(255,255,255,.7)",
    "glass-text": "#18181b", "glass-hover": "rgba(244,244,245,.94)", track: "#71717a",
    "lost-num": "#e4e4e7", lost: "#c2410c", shadow: "rgba(0,0,0,.18)", pop: "rgba(255,255,255,.98)",
    "fw-react": "#087ea4", "fw-solid": "#2c4f7c", "fw-vue": "#2f9768", "fw-svelte": "#e63900", "fw-jsx": "#71717a",
  },
};
const vars = (o) => Object.entries(o).map(([k, v]) => `--sn-${k}:${v}`).join(";");

// Spring easing (damping 0.52): ~15% overshoot, settled by the end.
const SPRING =
  "linear(0,.047,.165,.324,.497,.665,.814,.938,1.031,1.095,1.132,1.147,1.144,1.13,1.108,1.082,1.057,1.034,1.014," +
  ".999,.988,.982,.979,.978,.98,.983,.987,.99,.994,.997,.999,1.001,1.002,1.003,1.003,1.003,1.003,1.002,1.002,1.001,1.001)";

// Stylesheet for everything inside the shadow root. The UI was designed under a
// border-box reset, so it's restated here rather than inherited from the page.
const CSS = [
  `:host{${vars(THEMES.dark)}}`,
  `:host([data-theme="light"]){${vars(THEMES.light)}}`,
  "*,*::before,*::after{box-sizing:border-box}",
  "@keyframes dl-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
  "[data-spotnote-input]:empty::before{content:attr(data-placeholder);color:var(--sn-placeholder);pointer-events:none}",
  // Hover highlight + label: created once, slid between targets via transform,
  // faded in/out via .sn-on. .sn-snap moves them without animating.
  ".sn-hover,.sn-hover-label{position:fixed;left:0;top:0;pointer-events:none;opacity:0;" +
    "transition:transform .12s cubic-bezier(.2,0,0,1),width .12s cubic-bezier(.2,0,0,1),height .12s cubic-bezier(.2,0,0,1),opacity .12s ease}",
  `.sn-hover{z-index:2147483646;border-radius:3px;border:2px dashed ${T.accent};background:rgba(${T.accentRgb},0.10)}`,
  `.sn-hover-label{z-index:2147483647;display:flex;gap:6px;align-items:center;background:${T.accent};color:${T.accentInk};` +
    `font-family:${T.font};font-size:12px;font-weight:600;padding:2px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25)}`,
  ".sn-on{opacity:1}",
  ".sn-snap{transition:none}",
  // Note panel: grows out of its target (transform-origin is set per placement)
  // and shrinks back toward it on close.
  `.sn-panel{position:fixed;z-index:2147483647;width:300px;background:${T.bg};border:1px solid ${T.border};border-radius:10px;` +
    `box-shadow:0 12px 32px var(--sn-shadow);overflow:hidden;font-family:${T.font};animation:sn-pop-in .16s cubic-bezier(.2,0,0,1)}`,
  ".sn-panel.sn-leaving{animation:sn-pop-out .12s ease-in forwards;pointer-events:none}",
  "@keyframes sn-pop-in{from{opacity:0;transform:scale(.95)}}",
  "@keyframes sn-pop-out{to{opacity:0;transform:scale(.95)}}",
  // The note's send action: a quiet "↵ Add & copy" under the input, hidden
  // until there's text to send.
  `.sn-send{display:flex;align-items:center;gap:6px;margin:6px 0 0 auto;padding:2px 4px;border:none;border-radius:5px;` +
    `background:none;color:${T.textMuted};font:12px ${T.font};cursor:pointer;transition:opacity .14s,color .14s}`,
  `.sn-send:hover{color:${T.accentText}}`,
  `.sn-send:disabled{opacity:0;pointer-events:none}`,
  `.sn-send kbd{font:11px ${T.mono};padding:0 4px;border:1px solid ${T.border};border-radius:4px;color:inherit}`,
  // Pins: numbered, pop in with a slight overshoot, shrink away on delete, and
  // preview their note on hover. .sn-tip-left flips the preview near the right
  // edge so it can't widen the page.
  `.sn-pin{position:absolute;z-index:2147483647;cursor:pointer;width:22px;height:22px;border-radius:50%;background:${T.accent};` +
    `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);color:${T.accentInk};font:600 11px/18px ${T.font};text-align:center;` +
    "animation:sn-pin-in .24s cubic-bezier(.34,1.56,.64,1);transition:box-shadow .12s ease}",
  `.sn-pin:hover{box-shadow:0 0 0 3px rgba(${T.accentRgb},.35),0 2px 6px rgba(0,0,0,.35)}`,
  ".sn-pin.sn-leaving{animation:sn-pin-out .12s ease-in forwards;pointer-events:none}",
  "@keyframes sn-pin-in{from{transform:scale(0)}}",
  "@keyframes sn-pin-out{to{transform:scale(0);opacity:0}}",
  `.sn-pin-tip{position:absolute;left:28px;top:-3px;width:max-content;max-width:240px;padding:6px 9px;border-radius:8px;` +
    `background:${T.bg};border:1px solid ${T.border};color:${T.text};font:400 12px/16px ${T.font};text-align:left;` +
    "box-shadow:0 8px 24px var(--sn-shadow);white-space:pre-wrap;word-break:break-word;overflow:hidden;" +
    "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;pointer-events:none;" +
    "opacity:0;transform:translateX(-4px);transition:opacity .12s ease,transform .12s ease}",
  ".sn-pin.sn-tip-left .sn-pin-tip{left:auto;right:28px;transform:translateX(4px)}",
  ".sn-pin:hover .sn-pin-tip{opacity:1;transform:none}",
  // Launcher: a core button in a viewport corner (--x/--y = its centre). Opening
  // swings the items clockwise along a spiral into their slots on a quarter arc
  // (--start = the corner's first edge); closing reverses it.
  `.snl{position:fixed;left:var(--x);top:var(--y);width:0;height:0;z-index:2147483647;--r:72px;--stagger:40ms;--start:-90deg;` +
    `color:var(--sn-glass-text);font-family:${T.font};transition:left .6s ${SPRING},top .6s ${SPRING}}`,
  ".snl.snl-dragging,.snl.snl-no-anim{transition:none}",
  ".snl button{font:inherit;color:inherit;margin:0;-webkit-tap-highlight-color:transparent}",
  `.snl button:focus-visible{outline:2px solid ${T.accent};outline-offset:3px}`,
  ".snl-glass{background:var(--sn-glass);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);" +
    "border:1px solid var(--sn-glass-border);box-shadow:inset 0 1px 0 var(--sn-glass-inset),0 10px 28px rgba(0,0,0,.28);color:var(--sn-glass-text)}",
  ".snl-core{position:absolute;left:-24px;top:-24px;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;" +
    "padding:0;cursor:grab;touch-action:none;transition:background-color .25s ease,color .25s ease,box-shadow .25s ease}",
  ".snl-dragging .snl-core{cursor:grabbing}",
  `.snl-core svg{grid-area:1/1;transition:transform .55s ${SPRING},opacity .15s ease}`,
  '.snl[data-open="true"] .snl-plus{transform:rotate(135deg)}',
  // The core's colour is the mode: accent = selecting, glass = paused / closed.
  `.snl[data-open="true"][data-paused="false"] .snl-core{background:${T.accent};color:${T.accentInk};border-color:transparent;` +
    `box-shadow:0 0 0 6px rgba(${T.accentRgb},.38),0 10px 28px rgba(0,0,0,.28)}`,
  ".snl-check{opacity:0;transform:scale(.4)}",
  ".snl-done .snl-plus{opacity:0}",
  ".snl-done .snl-check{opacity:1;transform:none}",
  `.snl-track{position:absolute;pointer-events:none;overflow:visible;transform:rotate(var(--start));transition:transform .6s ${SPRING}}`,
  // A zero-length dash still paints its round cap, so it's hidden while closed.
  ".snl-track circle{fill:none;stroke:var(--sn-track);stroke-opacity:.35;stroke-width:1.5;stroke-linecap:round;" +
    "stroke-dasharray:0px calc(var(--C) * 1px);opacity:0;transition:stroke-dasharray .28s ease-in,opacity 0s linear .28s}",
  '.snl[data-open="true"] .snl-track circle{stroke-dasharray:calc(var(--C) * .25px) calc(var(--C) * 1px);opacity:1;' +
    "transition:stroke-dasharray .5s cubic-bezier(.2,0,0,1),opacity 0s}",
  `.snl[data-open="true"][data-paused="false"] .snl-track circle{stroke:${T.accent};stroke-opacity:.55}`,
  ".snl-item{--a:calc(var(--start) + var(--i) * 45deg);--a0:calc(var(--a) - 55deg);position:absolute;left:-20px;top:-20px;" +
    "width:40px;height:40px;border-radius:50%;display:grid;place-items:center;padding:0;cursor:pointer;" +
    "transform:rotate(var(--a0)) translateX(calc(var(--r) * .25)) rotate(calc(var(--a0) * -1)) scale(.3);opacity:0;pointer-events:none;" +
    "transition:transform .3s cubic-bezier(.4,0,1,1) calc((2 - var(--i)) * var(--stagger) * .6)," +
    "opacity .2s ease calc((2 - var(--i)) * var(--stagger) * .6 + .08s),background-color .15s ease}",
  '.snl[data-open="true"] .snl-item{transform:rotate(var(--a)) translateX(var(--r)) rotate(calc(var(--a) * -1)) scale(1);' +
    `opacity:1;pointer-events:auto;transition:transform .62s ${SPRING} calc(var(--i) * var(--stagger)),` +
    "opacity .16s ease calc(var(--i) * var(--stagger)),background-color .15s ease}",
  // z-index lifts the hovered item, so its name paints over the next item.
  ".snl-item:hover,.snl-item:focus-visible{z-index:1}",
  ".snl-item:hover{background:var(--sn-glass-hover)}",
  `.snl-ic{display:grid;transition:transform .18s ${SPRING}}`,
  ".snl-item:hover .snl-ic{transform:scale(1.12)}",
  `.snl-item[aria-pressed="true"],.snl-item[aria-expanded="true"]{color:${T.accentText}}`,
  // Item names sit on the side facing into the page.
  ".snl-tip{position:absolute;top:50%;white-space:nowrap;pointer-events:none;font-size:12px;font-weight:500;padding:4px 8px;" +
    "border-radius:6px;opacity:0;transform:translate(var(--tx),-50%);transition:opacity .12s ease,transform .12s ease}",
  '.snl[data-corner$="l"] .snl-tip{left:100%;margin-left:8px;--tx:-4px}',
  '.snl[data-corner$="r"] .snl-tip{right:100%;margin-right:8px;--tx:4px}',
  ".snl-item:hover .snl-tip,.snl-item:focus-visible .snl-tip{opacity:1;--tx:0px}",
  `.snl-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:${T.accent};` +
    `color:${T.accentInk};font:600 11px/14px ${T.font};text-align:center;border:2px solid var(--sn-bg)}`,
  ".snl-badge:empty{display:none}",
  `.snl-badge.snl-bump{animation:snl-bump .45s ${SPRING}}`,
  "@keyframes snl-bump{from{transform:scale(.4)}}",
  // Popovers (Notes, Settings): open diagonally from the middle item, outside the arc.
  ".snl-pop{position:absolute;width:340px;max-width:calc(100vw - 96px);border-radius:12px;padding:6px;opacity:0;pointer-events:none;transform:scale(.94);" +
    `transition:opacity .14s ease,transform .3s ${SPRING};--d:calc(var(--r) * .71 + 30px)}`,
  ".snl-pop.snl-show{opacity:1;pointer-events:auto;transform:none}",
  // Near-opaque: text-heavy popovers stay readable over busy pages.
  ".snl-pop{background:var(--sn-pop)}",
  '.snl[data-corner="bl"] .snl-pop{left:var(--d);bottom:var(--d);transform-origin:0 100%}',
  '.snl[data-corner="br"] .snl-pop{right:var(--d);bottom:var(--d);transform-origin:100% 100%}',
  '.snl[data-corner="tl"] .snl-pop{left:var(--d);top:var(--d);transform-origin:0 0}',
  '.snl[data-corner="tr"] .snl-pop{right:var(--d);top:var(--d);transform-origin:100% 0}',
  ".snl-pop h4{margin:6px 8px;font-size:13px;font-weight:600}",
  ".snl-notes ol{list-style:none;margin:0;padding:0;max-height:240px;overflow:auto}",
  ".snl-notes li{display:grid;grid-template-columns:20px 1fr;gap:2px 8px;padding:8px;border-radius:8px;cursor:pointer}",
  ".snl-notes li:hover{background:var(--sn-hover)}",
  `.snl-num{grid-row:span 2;width:20px;height:20px;border-radius:50%;background:${T.accent};color:${T.accentInk};` +
    `font:600 11px/20px ${T.font};text-align:center}`,
  `.snl-src{display:flex;min-width:0;font:12px ${T.mono};white-space:nowrap}`,
  ".snl-src{align-items:center;gap:5px}",
  ".snl-fw{display:inline-flex;flex:none}",
  ".snl-fw+span{overflow:hidden;text-overflow:ellipsis}",
  ".snl-txt{font-size:12px;color:var(--sn-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".snl-empty{margin:4px 8px 10px;font-size:12px;color:var(--sn-sub);line-height:1.5}",
  // A note whose element an edit moved away: dimmed, with copy/delete instead of open.
  ".snl-notes li.snl-lost{grid-template-columns:20px 1fr auto;cursor:default}",
  ".snl-lost .snl-num{background:var(--sn-lost-num);color:var(--sn-sub)}",
  `.snl-lost-tag{flex:none;margin-left:6px;font:500 11px/16px ${T.font};color:var(--sn-lost)}`,
  ".snl-lost .snl-src,.snl-lost .snl-txt{grid-column:2}",
  ".snl-acts{grid-column:3;grid-row:1/span 2;display:flex;align-items:center;gap:2px}",
  ".snl-acts button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:none;border-radius:6px;" +
    "background:none;color:var(--sn-sub);cursor:pointer}",
  ".snl-acts button:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  // Settings: one row per setting, label left, control right.
  ".snl-settings{width:300px}",
  ".snl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px}",
  ".snl-lbl{font-size:12px;color:var(--sn-sub)}",
  ".snl-swatches{display:flex;gap:6px}",
  ".snl-swatches button{width:20px;height:20px;padding:0;border-radius:50%;border:none;background:var(--c);cursor:pointer;" +
    "box-shadow:0 0 0 2px transparent;transition:box-shadow .12s ease}",
  '.snl-swatches button[aria-checked="true"]{box-shadow:0 0 0 2px var(--sn-bg),0 0 0 4px var(--sn-glass-text)}',
  ".snl-seg{display:flex;padding:2px;border-radius:8px;background:var(--sn-hover-strong)}",
  ".snl-seg button{padding:3px 9px;border:none;border-radius:6px;background:none;font-size:12px;cursor:pointer;color:var(--sn-sub)}",
  ".snl-seg button:hover{color:var(--sn-glass-text)}",
  '.snl-seg button[aria-checked="true"]{background:var(--sn-bg);color:var(--sn-glass-text);box-shadow:0 1px 2px rgba(0,0,0,.2)}',
  "@media (prefers-reduced-motion:reduce){.sn-hover,.sn-hover-label,.sn-pin-tip{transition:none}" +
    ".sn-panel,.sn-panel.sn-leaving,.sn-pin,.sn-pin.sn-leaving{animation:none}" +
    ".snl,.snl *{transition-duration:.01s!important;animation:none!important}}",
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

// Framework marks shown next to a file name. Paths from Simple Icons (CC0,
// simpleicons.org); `jsx` is the fallback when the JSX framework is unknown.
// `color` is the brand colour, per theme (--sn-fw-*): the dark theme uses
// lighter shades (Solid's logo blue, not its navy), the light theme darker ones.
const FW_PATHS = {
  react: "M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z",
  solid: "M11.558.788A9.082 9.082 0 0 0 9.776.99l-.453.15c-.906.303-1.656.755-2.1 1.348l-.301.452-2.035 3.528c.426-.387.974-.698 1.643-.894h.001l.613-.154h.001a8.82 8.82 0 0 1 1.777-.206c2.916-.053 6.033 1.148 8.423 2.36 2.317 1.175 3.888 2.32 3.987 2.39L24 5.518c-.082-.06-1.66-1.21-3.991-2.386-2.393-1.206-5.521-2.396-8.45-2.343zM8.924 5.366a8.634 8.634 0 0 0-1.745.203l-.606.151c-1.278.376-2.095 1.16-2.43 2.108-.334.948-.188 2.065.487 3.116.33.43.747.813 1.216 1.147L12.328 10h.001a6.943 6.943 0 0 1 6.013 1.013l2.844-.963c-.17-.124-1.663-1.2-3.91-2.34-2.379-1.206-5.479-2.396-8.352-2.344zm5.435 4.497a6.791 6.791 0 0 0-1.984.283L2.94 13.189 0 18.334l9.276-2.992a6.945 6.945 0 0 1 7.408 2.314v.001c.695.903.89 1.906.66 2.808l2.572-4.63c.595-1.041.45-2.225-.302-3.429a6.792 6.792 0 0 0-5.255-2.543zm-3.031 5.341a6.787 6.787 0 0 0-2.006.283L.008 18.492c.175.131 2.02 1.498 4.687 2.768 2.797 1.332 6.37 2.467 9.468 1.712l.454-.152h.002c1.278-.376 2.134-1.162 2.487-2.09.353-.93.207-2.004-.541-2.978a6.791 6.791 0 0 0-5.237-2.548z",
  vue: "M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z",
  svelte: "M10.354 21.125a4.44 4.44 0 0 1-4.765-1.767 4.109 4.109 0 0 1-.703-3.107 3.898 3.898 0 0 1 .134-.522l.105-.321.287.21a7.21 7.21 0 0 0 2.186 1.092l.208.063-.02.208a1.253 1.253 0 0 0 .226.83 1.337 1.337 0 0 0 1.435.533 1.231 1.231 0 0 0 .343-.15l5.59-3.562a1.164 1.164 0 0 0 .524-.778 1.242 1.242 0 0 0-.211-.937 1.338 1.338 0 0 0-1.435-.533 1.23 1.23 0 0 0-.343.15l-2.133 1.36a4.078 4.078 0 0 1-1.135.499 4.44 4.44 0 0 1-4.765-1.766 4.108 4.108 0 0 1-.702-3.108 3.855 3.855 0 0 1 1.742-2.582l5.589-3.563a4.072 4.072 0 0 1 1.135-.499 4.44 4.44 0 0 1 4.765 1.767 4.109 4.109 0 0 1 .703 3.107 3.943 3.943 0 0 1-.134.522l-.105.321-.286-.21a7.204 7.204 0 0 0-2.187-1.093l-.208-.063.02-.207a1.255 1.255 0 0 0-.226-.831 1.337 1.337 0 0 0-1.435-.532 1.231 1.231 0 0 0-.343.15L8.62 9.368a1.162 1.162 0 0 0-.524.778 1.24 1.24 0 0 0 .211.937 1.338 1.338 0 0 0 1.435.533 1.235 1.235 0 0 0 .344-.151l2.132-1.36a4.067 4.067 0 0 1 1.135-.498 4.44 4.44 0 0 1 4.765 1.766 4.108 4.108 0 0 1 .702 3.108 3.857 3.857 0 0 1-1.742 2.583l-5.589 3.562a4.072 4.072 0 0 1-1.135.499m10.358-17.95C18.484-.015 14.082-.96 10.9 1.068L5.31 4.63a6.412 6.412 0 0 0-2.896 4.295 6.753 6.753 0 0 0 .666 4.336 6.43 6.43 0 0 0-.96 2.396 6.833 6.833 0 0 0 1.168 5.167c2.229 3.19 6.63 4.135 9.812 2.108l5.59-3.562a6.41 6.41 0 0 0 2.896-4.295 6.756 6.756 0 0 0-.665-4.336 6.429 6.429 0 0 0 .958-2.396 6.831 6.831 0 0 0-1.167-5.168Z",
};
export const FRAMEWORKS = {
  react: { name: "React", color: "var(--sn-fw-react)" },
  solid: { name: "Solid", color: "var(--sn-fw-solid)" },
  vue: { name: "Vue", color: "var(--sn-fw-vue)" },
  svelte: { name: "Svelte", color: "var(--sn-fw-svelte)" },
  jsx: { name: "JSX", color: "var(--sn-fw-jsx)" },
};
// An inline SVG in currentColor, so the caller picks the colour.
export function fwIcon(kind, size = 12) {
  const body = FW_PATHS[kind]
    ? `<path fill="currentColor" d="${FW_PATHS[kind]}"/>`
    : '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;display:block">${body}</svg>`;
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
