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

// Accent presets for the Settings menu: the brand yellow, then system-style
// colours at full strength, in hue order. `ink` is the text on the accent (dark,
// or white on violet: each ≥ 5:1); `deep` is the hue dark enough to read as
// text on the light theme (≥ 4.5:1 on white).
export const ACCENTS = {
  yellow: { name: "Yellow", accent: "#ffd84d", ink: "#1a1600", deep: "#8a6a00" },
  orange: { name: "Orange", accent: "#ff9500", ink: "#1f1100", deep: "#b25000" },
  pink: { name: "Pink", accent: "#ff375f", ink: "#1f0008", deep: "#d70f45" },
  violet: { name: "Violet", accent: "#5e5ce6", ink: "#ffffff", deep: "#5e5ce6" },
  blue: { name: "Blue", accent: "#0a84ff", ink: "#00142b", deep: "#0062cc" },
  green: { name: "Green", accent: "#30c85e", ink: "#001f0b", deep: "#1b7f3b" },
};

// Theme surfaces. Dark is the original look; light mirrors it.
const THEMES = {
  dark: {
    bg: "#1a1a1a", "bg-input": "#141414", border: "#333", "border-subtle": "#262626",
    text: "#ededed", muted: "#888", icon: "#999", sub: "#a1a1aa", placeholder: "#666",
    hover: "rgba(255,255,255,.06)", "hover-strong": "rgba(255,255,255,.08)", "text-strong": "#fff",
    glass: "rgba(24,24,28,.74)", "glass-border": "rgba(255,255,255,.10)", "glass-inset": "rgba(255,255,255,.06)",
    "glass-text": "#f2f2f3", "glass-hover": "rgba(44,44,50,.86)", track: "#a1a1aa",
    "lost-num": "#3f3f46", lost: "#fb923c", shadow: "rgba(0,0,0,.5)", pop: "rgba(24,24,28,.97)", foot: "rgba(0,0,0,.3)",
    "fw-react": "#61dafb", "fw-solid": "#76b3e1", "fw-vue": "#42b883", "fw-svelte": "#ff3e00", "fw-jsx": "#a1a1aa",
    // code in the agent's messages (GitHub's dark palette)
    "tk-tag": "#7ee787", "tk-attr": "#79c0ff", "tk-str": "#a5d6ff", "tk-kw": "#ff7b72", "tk-num": "#79c0ff", "tk-com": "#8b949e",
    "code-bg": "rgba(255,255,255,.06)", "code-border": "rgba(255,255,255,.09)", "code-text": "#e6edf3",
  },
  light: {
    bg: "#ffffff", "bg-input": "#f4f4f5", border: "#e4e4e7", "border-subtle": "#f0f0f1",
    text: "#18181b", muted: "#71717a", icon: "#71717a", sub: "#71717a", placeholder: "#a1a1aa",
    hover: "rgba(0,0,0,.04)", "hover-strong": "rgba(0,0,0,.06)", "text-strong": "#000",
    glass: "rgba(255,255,255,.8)", "glass-border": "rgba(0,0,0,.08)", "glass-inset": "rgba(255,255,255,.7)",
    "glass-text": "#18181b", "glass-hover": "rgba(244,244,245,.94)", track: "#71717a",
    "lost-num": "#e4e4e7", lost: "#c2410c", shadow: "rgba(0,0,0,.18)", pop: "rgba(255,255,255,.98)", foot: "rgba(0,0,0,.04)",
    "fw-react": "#087ea4", "fw-solid": "#2c4f7c", "fw-vue": "#2f9768", "fw-svelte": "#e63900", "fw-jsx": "#71717a",
    // code in the agent's messages (GitHub's light palette)
    "tk-tag": "#116329", "tk-attr": "#0550ae", "tk-str": "#0a3069", "tk-kw": "#cf222e", "tk-num": "#0550ae", "tk-com": "#6e7781",
    "code-bg": "#f6f8fa", "code-border": "#d8dee4", "code-text": "#1f2328",
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
  `.sn-hover{z-index:2147483640;border-radius:3px;border:2px dashed ${T.accent};background:rgba(${T.accentRgb},0.10)}`,
  `.sn-hover-label{z-index:2147483642;display:flex;gap:6px;align-items:center;background:${T.accent};color:${T.accentInk};` +
    `font-family:${T.font};font-size:12px;font-weight:600;padding:2px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25)}`,
  ".sn-on{opacity:1}",
  ".sn-snap{transition:none}",
  // Note panel: grows out of its target (transform-origin is set per placement)
  // and shrinks back toward it on close.
  `.sn-panel{position:fixed;z-index:2147483647;width:300px;background:${T.bg};border:1px solid ${T.border};border-radius:10px;` +
    `box-shadow:0 12px 32px var(--sn-shadow);overflow:hidden;font-family:${T.font};animation:sn-pop-in .16s cubic-bezier(.2,0,0,1);` +
    "display:flex;flex-direction:column}",
  // Resized (width/height set): the conversation takes the room, or with none,
  // the note input does.
  ".sn-panel.sn-sized .sn-thread{flex:1 1 auto;min-height:0;max-height:none}",
  ".sn-panel.sn-sized:not(:has(.sn-thread)) .sn-compose{flex:1 1 auto;min-height:0}",
  ".sn-panel.sn-sized:not(:has(.sn-thread)) .sn-compose [data-spotnote-input]{flex:1 1 auto;max-height:none!important}",
  // The resize grip, in the bottom-right corner.
  `.sn-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;color:${T.textIcon};opacity:.5}`,
  ".sn-resize:hover{opacity:1}",
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
  // Pins: numbered, pop in with a slight overshoot, shrink away on delete.
  // Stacking, bottom to top: the hover and selection outlines, pins (they sit on
  // an element's corner), the hover label, then the layers — the note panel and
  // the launcher with its menus — which take the top z-indices in the order you
  // last used them (layers.js).
  `.sn-pin{position:absolute;z-index:2147483641;cursor:pointer;width:22px;height:22px;border-radius:50%;background:${T.accent};` +
    `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);color:${T.accentInk};font:600 11px/18px ${T.font};text-align:center;` +
    "animation:sn-pin-in .24s cubic-bezier(.34,1.56,.64,1);transition:box-shadow .12s ease}",
  ".sn-pin>span:first-child{display:grid;place-items:center;height:100%;line-height:1}", // number or state icon, centred
  `.sn-pin:hover{box-shadow:0 0 0 3px rgba(${T.accentRgb},.35),0 2px 6px rgba(0,0,0,.35)}`,
  ".sn-pin.sn-done{background:var(--sn-bg);color:var(--sn-accent-text)}",
  // An agent has it: a ring spins around the pin until it answers.
  ".sn-pin.sn-working{background:var(--sn-bg);color:var(--sn-accent-text)}",
  `.sn-pin.sn-working::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:2px solid transparent;` +
    `border-top-color:${T.accent};animation:sn-spin .9s linear infinite;pointer-events:none}`,
  "@keyframes sn-spin{to{transform:rotate(360deg)}}",
  // The agent won't make the change: greyed out.
  ".sn-pin.sn-dismissed{background:var(--sn-lost-num);color:var(--sn-sub)}",
  // The agent asked something: a slow pulse until you answer.
  `.sn-pin.sn-asked{animation:sn-ask 1.6s ease-in-out infinite}`,
  `@keyframes sn-ask{50%{box-shadow:0 0 0 5px rgba(${T.accentRgb},.4),0 2px 6px rgba(0,0,0,.35)}}`,
  // The note panel's conversation, above the reply input.
  ".sn-thread{max-height:220px;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}",
  `.sn-msg{color:${T.text};font:13px/18px ${T.font};white-space:pre-wrap;word-break:break-word}`,
  `.sn-msg-agent{padding-left:8px;border-left:2px solid ${T.accent}}`,
  // The agent's Markdown (markdown.js): compact, to fit the panel.
  ".sn-md{white-space:normal}",
  ".sn-md p,.sn-md ul,.sn-md ol,.sn-md pre{margin:0 0 6px}",
  ".sn-md>:last-child{margin-bottom:0}",
  ".sn-md ul,.sn-md ol{padding-left:18px}",
  ".sn-md li{margin:2px 0}",
  ".sn-md .sn-md-h{font-weight:600}",
  ".sn-md strong{font-weight:600}",
  // Code: a bordered chip inline, a block that wraps to the panel's width.
  `.sn-md code{font:11.5px/1.5 ${T.mono};padding:1px 5px;border-radius:5px;background:var(--sn-code-bg);` +
    "border:1px solid var(--sn-code-border);color:var(--sn-code-text);overflow-wrap:anywhere;-webkit-box-decoration-break:clone;box-decoration-break:clone}",
  `.sn-md pre{font:11.5px/18px ${T.mono};padding:8px 10px;border-radius:8px;background:var(--sn-code-bg);border:1px solid var(--sn-code-border);` +
    "color:var(--sn-code-text);white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2}",
  ".sn-md code.sn-nowrap{white-space:nowrap}",
  ".sn-tk-tag{color:var(--sn-tk-tag)}",
  ".sn-tk-attr{color:var(--sn-tk-attr)}",
  ".sn-tk-str{color:var(--sn-tk-str)}",
  ".sn-tk-kw{color:var(--sn-tk-kw)}",
  ".sn-tk-num{color:var(--sn-tk-num)}",
  ".sn-tk-com{color:var(--sn-tk-com);font-style:italic}",
  ".sn-md p{line-height:1.55}",
  // A file the agent mentioned: click to open it in your editor.
  `.sn-file{all:unset;cursor:pointer;color:${T.accentText};text-decoration:underline dotted;text-underline-offset:2px}`,
  ".sn-file:hover{text-decoration-style:solid}",
  ".sn-file.sn-file-missing{color:inherit;text-decoration:line-through;cursor:default}",
  `.sn-file-hint{color:${T.textMuted};font-size:12px}`,
  // The panel header's file:line: a button that opens it in your editor.
  `.sn-loc{all:unset;display:inline-flex;align-items:center;align-self:center;flex-shrink:0;cursor:pointer;color:${T.textMuted};font:11px ${T.mono};border-radius:4px}`,
  `.sn-loc:hover{color:${T.text}}`,
  // Dotted like the file links in the agent's messages; solid on hover.
  ".sn-loc span>span:last-child{text-decoration:underline dotted;text-underline-offset:2px}",
  ".sn-loc:hover span>span:last-child{text-decoration-style:solid}",
  `.sn-loc:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}`,
  // Settings → Editor
  ".snl-select{appearance:none;-webkit-appearance:none;font:inherit;font-size:13px;color:var(--sn-glass-text);background:none;border:none;" +
    "padding:4px 18px 4px 6px;margin-right:-4px;border-radius:6px;cursor:pointer;text-align:right;" +
    "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M7 10l5 5 5-5'/%3E%3C/svg%3E\");" +
    "background-repeat:no-repeat;background-position:right 2px center}",
  ".snl-select:hover{background-color:var(--sn-hover-strong)}",
  ".snl-select option{color:initial}",
  `.sn-who{display:flex;align-items:center;gap:5px;font-size:11px;line-height:16px;color:${T.textMuted}}`,
  ".sn-agent-mark{display:inline-grid;color:var(--sn-text)}",
  // In place of the input while an agent works on the note.
  `.sn-busy{display:flex;align-items:center;gap:8px;min-height:20px;color:${T.textMuted};font:13px/18px ${T.font}}`,
  `.sn-busy span{flex:none;width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(${T.accentRgb},.3);` +
    `border-top-color:${T.accent};animation:sn-spin .9s linear infinite}`,
  ".sn-pin.sn-leaving{animation:sn-pin-out .12s ease-in forwards;pointer-events:none}",
  "@keyframes sn-pin-in{from{transform:scale(0)}}",
  "@keyframes sn-pin-out{to{transform:scale(0);opacity:0}}",
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
  // The header's rule runs edge to edge: undo each popover's side padding, and
  // put it back inside so the title lines up with the rows below (14px in).
  ".snl-notes .snl-head{margin:0 -6px;padding:0 14px}",
  ".snl-count{font-size:12px;color:var(--sn-sub);font-variant-numeric:tabular-nums}",
  // The list spans the popover edge to edge and runs to its bottom: rows and
  // page headings are full-width bands (the 14px moves into each row).
  ".snl-notes{padding-bottom:0;overflow:hidden}", // overflow: the bottom row's hover keeps the rounded corners
  ".snl-notes ol{list-style:none;margin:0 -6px;padding:0;max-height:240px;overflow:auto}",
  ".snl-notes li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:9px 14px;cursor:pointer;border-top:1px solid var(--sn-glass-border)}",
  ".snl-notes li:first-child{border-top:none}", // right under the header's rule
  ".snl-notes li:hover{background:var(--sn-hover)}",
  // Page headings in the notes list ("This page", then each other page's path):
  // a band edge to edge, in the Settings footer's colour.
  `.snl-notes li.snl-group{display:block;margin:0;padding:5px 14px;border-radius:0;background:var(--sn-foot);` +
    "border-top:1px solid var(--sn-glass-border);font:500 11px/16px " + T.font + ";color:var(--sn-sub);cursor:default;" +
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".snl-notes li.snl-group:hover{background:var(--sn-foot)}",
  // The heading is a button that folds its section.
  ".snl-notes li.snl-group{padding:0}",
  ".snl-group button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;padding:5px 14px 5px 10px;cursor:pointer}",
  ".snl-group button:hover{color:var(--sn-glass-text)}",
  `.snl-group button:focus-visible{outline:2px solid ${T.accent};outline-offset:-2px}`,
  ".snl-fold{display:grid;transition:transform .15s ease}",
  ".snl-fold svg{width:12px;height:12px}",
  '.snl-group button[aria-expanded="true"] .snl-fold{transform:rotate(90deg)}',
  // "This page (2)": the count right after the title; a long path ellipsizes first.
  ".snl-group-title{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}",
  ".snl-group .snl-count{flex:none;margin-left:-2px;font-size:11px}",
  ".snl-notes li.snl-group:first-child{margin-top:0;border-top:none}", // right under the header's rule
  // The pin's number (or state icon), small, before the file name.
  `.snl-num{flex:none;width:16px;height:16px;border-radius:50%;background:${T.accent};color:${T.accentInk};` +
    `font:600 10px/1 ${T.font};display:grid;place-items:center}`,
  ".snl-num svg{width:10px;height:10px}",
  // The checkbox in front of each note, and the header's delete button.
  ".snl-pick{grid-row:span 2;align-self:start;margin:2px 0 0;cursor:pointer}", // the browser's own checkbox
  ".snl-head-acts{margin-left:auto;display:flex}",
  ".snl .snl-del{padding:3px 8px;border:none;border-radius:6px;background:none;color:var(--sn-sub);font:500 12px " + T.font + ";cursor:pointer}",
  ".snl .snl-del:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  ".snl .snl-del.snl-del-sure{background:#dc2626;color:#fff}",
  `.snl-src{display:flex;min-width:0;font:12px ${T.mono};white-space:nowrap}`,
  ".snl-src{align-items:center;gap:5px}",
  ".snl-fw{display:inline-flex;flex:none}",
  ".snl-fw+span{overflow:hidden;text-overflow:ellipsis}",
  ".snl-txt{font-size:12px;color:var(--sn-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".snl-empty{margin:4px 8px 10px;font-size:12px;color:var(--sn-sub);line-height:1.5}",
  // A note an agent resolved over MCP: a check instead of its number, and its summary.
  ".snl-asked .snl-sum{font-weight:500}",
  ".snl-working .snl-sum,.snl-dismissed .snl-sum{color:var(--sn-sub)}",
  ".snl-dismissed .snl-num{background:var(--sn-lost-num);color:var(--sn-sub)}",
  // Working: the same spinner as on its pin, on a faint track.
  `.snl-working .snl-num{position:relative;background:none;box-shadow:inset 0 0 0 1.5px rgba(${T.accentRgb},.3);color:var(--sn-accent-text)}`,
  `.snl-working .snl-num::after{content:"";position:absolute;inset:0;border-radius:50%;border:1.5px solid transparent;` +
    `border-top-color:${T.accent};animation:sn-spin .9s linear infinite}`,
  ".snl-done .snl-num{background:none;box-shadow:inset 0 0 0 1.5px var(--sn-accent);color:var(--sn-accent-text)}",
  ".snl-sum{grid-column:2;font-size:12px;color:var(--sn-accent-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  // A note whose element an edit moved away: dimmed, with copy/delete instead of open.
  ".snl-notes li.snl-lost{grid-template-columns:auto 1fr auto;cursor:default}",
  ".snl-lost .snl-num{background:var(--sn-lost-num);color:var(--sn-sub)}",
  `.snl-lost-tag{flex:none;margin-left:6px;font:500 11px/16px ${T.font};color:var(--sn-lost)}`,
  ".snl-lost .snl-src,.snl-lost .snl-txt{grid-column:2}",
  ".snl-acts{grid-column:3;grid-row:1/span 2;display:flex;align-items:center;gap:2px}",
  ".snl-acts button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:none;border-radius:6px;" +
    "background:none;color:var(--sn-sub);cursor:pointer}",
  ".snl-acts button:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  // Settings: one row per setting, label left, control right.
  // Settings: a header, then rows of label · value split by thin rules; help
  // behind each (?).
  ".snl-settings{width:292px;padding:6px 14px 10px}",
  ".snl-settings .snl-head{margin:0 -14px 2px;padding:0 14px}",
  ".snl-head{display:flex;align-items:center;gap:6px;height:40px;margin-bottom:2px;border-bottom:1px solid var(--sn-glass-border)}",
  ".snl-title{font-size:13px;font-weight:600}",
  ".snl-head>.snl-icon-btn:last-child{margin-left:auto}", // a trailing button (theme) sits at the right
  ".snl-icon-btn{display:grid;place-items:center;width:28px;height:28px;margin-right:-6px;padding:0;border:none;border-radius:7px;background:none;color:var(--sn-sub);cursor:pointer;text-decoration:none}",
  ".snl-icon-btn:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  ".snl-back{margin:0 0 0 -8px}",
  // Footer: version and GitHub, centred on a darker band across the panel's
  // bottom (the negative margins undo the panel's padding).
  ".snl-foot{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;margin:6px -14px -10px;" +
    "border-top:1px solid var(--sn-glass-border);border-radius:0 0 12px 12px;background:var(--sn-foot);font-size:11px;color:var(--sn-sub)}",
  ".snl-foot .snl-icon-btn{width:22px;height:22px;margin:0;border-radius:6px}",
  ".snl-foot svg{width:13px;height:13px}",
  ".snl-srow{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:40px;padding:0;" +
    "border:none;background:none;text-align:left;font:inherit;color:inherit}",
  ".snl-link{cursor:pointer}",
  ".snl-link:hover .snl-chev{color:var(--sn-glass-text);transform:translateX(2px)}",
  ".snl-rule{height:1px;background:var(--sn-glass-border)}",
  ".snl-label{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--sn-sub)}",
  ".snl-value{display:inline-flex;align-items:center;gap:4px;font-size:13px}",
  ".snl-chev{display:grid;color:var(--sn-sub);transition:transform .15s ease,color .15s ease}",
  // (?) with its tooltip on hover or focus.
  ".snl-help{position:relative;display:grid;color:var(--sn-sub);cursor:help;outline:none}",
  ".snl-help svg{opacity:.7}", // on the icon only: the tooltip inside must stay opaque
  ".snl-help:hover svg,.snl-help:focus-visible svg{opacity:1}",
  `.snl-help-tip{position:absolute;left:50%;bottom:calc(100% + 6px);width:max-content;max-width:200px;padding:6px 8px;border-radius:6px;` +
    `background:var(--sn-text);color:var(--sn-bg);font:400 11px/15px ${T.font};text-align:left;pointer-events:none;` +
    "box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transform:translate(-50%,2px);transition:opacity .12s ease,transform .12s ease;z-index:2}",
  ".snl-help:hover .snl-help-tip,.snl-help:focus-visible .snl-help-tip{opacity:1;transform:translate(-50%,0)}",
  ".snl-swatches{display:flex;gap:7px}",
  ".snl-swatches button{width:18px;height:18px;padding:0;border-radius:50%;border:none;background:var(--c);cursor:pointer;" +
    "box-shadow:0 0 0 2px transparent;transition:box-shadow .12s ease,transform .12s ease}",
  ".snl-swatches button:hover{transform:scale(1.08)}",
  '.snl-swatches button[aria-checked="true"]{box-shadow:0 0 0 2px var(--sn-pop),0 0 0 4px var(--c)}',
  // Coding agent: status with a dot; its page explains and shows the command.
  ".snl-mcp{display:inline-flex;align-items:center;gap:7px}",
  ".snl-dot{width:7px;height:7px;border-radius:50%;background:var(--sn-sub)}",
  ".snl-mcp-on .snl-dot{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}",
  `.snl-mcp-connecting .snl-dot{background:${T.accent};animation:snl-blink 1s ease-in-out infinite}`,
  "@keyframes snl-blink{50%{opacity:.3}}",
  ".snl-mcp-off{color:var(--sn-sub)}",
  ".snl-agent{padding:2px 0 4px}",
  ".snl-para{margin:4px 0 0;font-size:12px;line-height:17px}",
  ".snl-muted{color:var(--sn-sub)}",
  `.snl-cmd{display:flex;align-items:center;gap:4px;margin-top:8px;padding:6px 4px 6px 10px;border-radius:8px;background:var(--sn-hover-strong)}`,
  `.snl-cmd code{flex:1;min-width:0;font:11px/16px ${T.mono};color:var(--sn-glass-text);overflow-wrap:anywhere}`,
  ".snl-cmd button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:none;color:var(--sn-sub);cursor:pointer}",
  ".snl-cmd button:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  ".snl-seg{display:flex;padding:2px;border-radius:8px;background:var(--sn-hover-strong)}",
  ".snl-seg button{padding:3px 9px;border:none;border-radius:6px;background:none;font-size:12px;cursor:pointer;color:var(--sn-sub)}",
  ".snl-seg button:hover{color:var(--sn-glass-text)}",
  '.snl-seg button[aria-checked="true"]{background:var(--sn-bg);color:var(--sn-glass-text);box-shadow:0 1px 2px rgba(0,0,0,.2)}',
  "@media (prefers-reduced-motion:reduce){.sn-hover,.sn-hover-label{transition:none}" +
    ".sn-panel,.sn-panel.sn-leaving,.sn-pin,.sn-pin.sn-leaving,.sn-pin.sn-asked,.sn-pin.sn-working::after,.sn-busy span{animation:none}" +
    ".snl,.snl *,.snl-working .snl-num::after{transition-duration:.01s!important;animation:none!important}}",
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

// A note's state on its pin and in the notes list, in place of its number.
// Drawn, not typed: glyphs like "…" sit on the text baseline, below centre.
const mark = (body, paint = 'fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg width="12" height="12" viewBox="0 0 24 24" ${paint} aria-hidden="true" style="display:block">${body}</svg>`;
export const STATE_ICONS = {
  done: mark('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  dismissed: mark('<path d="M6 12h12"/>'),
  asked: mark('<path d="M8.8 8.8a3.3 3.3 0 1 1 4.6 3c-1 .5-1.4 1.2-1.4 2.4"/><path d="M12 19h.01"/>'),
  working: mark('<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>', 'fill="currentColor"'),
};

// Coding agents, matched on the name they give the MCP server ("claude-code"),
// for the mark next to "Agent" on their messages. Paths from Simple Icons (CC0);
// `color` null = the text colour (the brand's own is black). No path (Codex:
// OpenAI's mark isn't in Simple Icons) = the name instead of a mark.
const AGENTS = [
  { test: /claude/i, name: "Claude Code", color: "#D97757", path: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" },
  { test: /cursor/i, name: "Cursor", color: null, path: "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" },
  { test: /gemini/i, name: "Gemini", color: "#8E75B2", path: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" },
  { test: /windsurf|codeium/i, name: "Windsurf", color: null, path: "M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z" },
  { test: /codex|openai/i, name: "Codex" },
  { test: /copilot/i, name: "GitHub Copilot", color: null, path: "M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" },
];
// { name, svg } for a known agent; { name } for another; null without a name.
export function agentMark(client) {
  if (!client) return null;
  const a = AGENTS.find((x) => x.test.test(client));
  if (!a?.path) return { name: a?.name ?? client };
  const fill = a.color ?? "currentColor";
  return { name: a.name, svg: `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="display:block"><path fill="${fill}" d="${a.path}"/></svg>` };
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
