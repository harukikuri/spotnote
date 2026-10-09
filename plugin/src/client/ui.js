// Small UI kit (buttons + icon buttons) as plain JS, with a fixed dark theme +
// highlighter-yellow accent.

export const T = {
  accent: "#ffd84d", // highlighter yellow
  accentRgb: "255,216,77",
  accentInk: "#1a1600", // text/icons drawn on the accent
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

// Spring easing (damping 0.52): ~15% overshoot, settled by the end.
const SPRING =
  "linear(0,.047,.165,.324,.497,.665,.814,.938,1.031,1.095,1.132,1.147,1.144,1.13,1.108,1.082,1.057,1.034,1.014," +
  ".999,.988,.982,.979,.978,.98,.983,.987,.99,.994,.997,.999,1.001,1.002,1.003,1.003,1.003,1.003,1.002,1.002,1.001,1.001)";

// Stylesheet for everything inside the shadow root. The UI was designed under a
// border-box reset, so it's restated here rather than inherited from the page.
const CSS = [
  "*,*::before,*::after{box-sizing:border-box}",
  "@keyframes dl-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
  "[data-spotnote-input]:empty::before{content:attr(data-placeholder);color:#666;pointer-events:none}",
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
    `box-shadow:0 12px 32px rgba(0,0,0,0.5);overflow:hidden;font-family:${T.font};animation:sn-pop-in .16s cubic-bezier(.2,0,0,1)}`,
  ".sn-panel.sn-leaving{animation:sn-pop-out .12s ease-in forwards;pointer-events:none}",
  "@keyframes sn-pop-in{from{opacity:0;transform:scale(.95)}}",
  "@keyframes sn-pop-out{to{opacity:0;transform:scale(.95)}}",
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
    "box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:pre-wrap;word-break:break-word;overflow:hidden;" +
    "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;pointer-events:none;" +
    "opacity:0;transform:translateX(-4px);transition:opacity .12s ease,transform .12s ease}",
  ".sn-pin.sn-tip-left .sn-pin-tip{left:auto;right:28px;transform:translateX(4px)}",
  ".sn-pin:hover .sn-pin-tip{opacity:1;transform:none}",
  // Launcher: a core button in a viewport corner (--x/--y = its centre). Opening
  // swings the items clockwise along a spiral into their slots on a quarter arc
  // (--start = the corner's first edge); closing reverses it.
  `.snl{position:fixed;left:var(--x);top:var(--y);width:0;height:0;z-index:2147483647;--r:72px;--stagger:40ms;--start:-90deg;` +
    `font-family:${T.font};transition:left .6s ${SPRING},top .6s ${SPRING}}`,
  ".snl.snl-dragging,.snl.snl-no-anim{transition:none}",
  ".snl button{font:inherit;color:inherit;margin:0;-webkit-tap-highlight-color:transparent}",
  `.snl button:focus-visible{outline:2px solid ${T.accent};outline-offset:3px}`,
  ".snl-glass{background:rgba(24,24,28,.74);-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);" +
    "border:1px solid rgba(255,255,255,.10);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 10px 28px rgba(0,0,0,.28);color:#f2f2f3}",
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
  ".snl-track circle{fill:none;stroke:#a1a1aa;stroke-opacity:.35;stroke-width:1.5;stroke-linecap:round;" +
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
  ".snl-item:hover{background:rgba(44,44,50,.86)}",
  `.snl-ic{display:grid;transition:transform .18s ${SPRING}}`,
  ".snl-item:hover .snl-ic{transform:scale(1.12)}",
  `.snl-item[aria-pressed="true"],.snl-item[aria-expanded="true"]{color:${T.accent}}`,
  // Item names sit on the side facing into the page.
  ".snl-tip{position:absolute;top:50%;white-space:nowrap;pointer-events:none;font-size:12px;font-weight:500;padding:4px 8px;" +
    "border-radius:6px;opacity:0;transform:translate(var(--tx),-50%);transition:opacity .12s ease,transform .12s ease}",
  '.snl[data-corner$="l"] .snl-tip{left:100%;margin-left:8px;--tx:-4px}',
  '.snl[data-corner$="r"] .snl-tip{right:100%;margin-right:8px;--tx:4px}',
  ".snl-item:hover .snl-tip,.snl-item:focus-visible .snl-tip{opacity:1;--tx:0px}",
  `.snl-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:${T.accent};` +
    `color:${T.accentInk};font:600 11px/14px ${T.font};text-align:center;border:2px solid rgba(24,24,28,.9)}`,
  ".snl-badge:empty{display:none}",
  `.snl-badge.snl-bump{animation:snl-bump .45s ${SPRING}}`,
  "@keyframes snl-bump{from{transform:scale(.4)}}",
  // Notes popover: opens diagonally from the middle item, outside the arc.
  ".snl-notes{position:absolute;width:260px;border-radius:12px;padding:6px;opacity:0;pointer-events:none;transform:scale(.94);" +
    `transition:opacity .14s ease,transform .3s ${SPRING};--d:calc(var(--r) * .71 + 30px)}`,
  ".snl-notes.snl-show{opacity:1;pointer-events:auto;transform:none}",
  '.snl[data-corner="bl"] .snl-notes{left:var(--d);bottom:var(--d);transform-origin:0 100%}',
  '.snl[data-corner="br"] .snl-notes{right:var(--d);bottom:var(--d);transform-origin:100% 100%}',
  '.snl[data-corner="tl"] .snl-notes{left:var(--d);top:var(--d);transform-origin:0 0}',
  '.snl[data-corner="tr"] .snl-notes{right:var(--d);top:var(--d);transform-origin:100% 0}',
  ".snl-notes h4{margin:6px 8px;font-size:13px;font-weight:600}",
  ".snl-notes ol{list-style:none;margin:0;padding:0;max-height:240px;overflow:auto}",
  ".snl-notes li{display:grid;grid-template-columns:20px 1fr;gap:2px 8px;padding:8px;border-radius:8px;cursor:pointer}",
  ".snl-notes li:hover{background:rgba(255,255,255,.06)}",
  `.snl-num{grid-row:span 2;width:20px;height:20px;border-radius:50%;background:${T.accent};color:${T.accentInk};` +
    `font:600 11px/20px ${T.font};text-align:center}`,
  `.snl-src{font:12px ${T.mono};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
  ".snl-txt{font-size:12px;color:#a1a1aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".snl-empty{margin:4px 8px 10px;font-size:12px;color:#a1a1aa;line-height:1.5}",
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
  if (variant === "primary") s.push(`background:${T.accent}`, `color:${T.accentInk}`);
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
