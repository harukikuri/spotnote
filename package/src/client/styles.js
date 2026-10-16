// The stylesheet inside Spotnote's shadow root (see uiRoot in ui.js): the light
// and dark theme surfaces as --sn-* variables, and every rule the UI uses.

// Colour/font tokens for inline styles: the --sn-* variables below, so they
// follow the theme and accent live.
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

// Theme surfaces. Dark is the original look; light mirrors it.
const THEMES = {
  dark: {
    bg: "#1a1a1a",
    "bg-input": "#141414",
    border: "#333",
    "border-subtle": "#262626",
    text: "#ededed",
    muted: "#888",
    icon: "#999",
    sub: "#a1a1aa",
    placeholder: "#666",
    hover: "rgba(255,255,255,.06)",
    "hover-strong": "rgba(255,255,255,.08)",
    "text-strong": "#fff",
    glass: "rgba(24,24,28,.74)",
    "glass-border": "rgba(255,255,255,.10)",
    "glass-inset": "rgba(255,255,255,.06)",
    "glass-text": "#f2f2f3",
    "glass-hover": "rgba(44,44,50,.86)",
    track: "#a1a1aa",
    "lost-num": "#3f3f46",
    lost: "#fb923c",
    shadow: "rgba(0,0,0,.5)",
    pop: "rgba(24,24,28,.97)",
    foot: "rgba(0,0,0,.3)",
    "fw-react": "#61dafb",
    "fw-solid": "#76b3e1",
    "fw-vue": "#42b883",
    "fw-svelte": "#ff3e00",
    "fw-astro": "#bc52ee",
    "fw-jsx": "#a1a1aa",
    // code in the agent's messages (GitHub's dark palette)
    "tk-tag": "#7ee787",
    "tk-attr": "#79c0ff",
    "tk-str": "#a5d6ff",
    "tk-kw": "#ff7b72",
    "tk-num": "#79c0ff",
    "tk-com": "#8b949e",
    "code-bg": "rgba(255,255,255,.06)",
    "code-border": "rgba(255,255,255,.09)",
    "code-text": "#e6edf3",
  },
  light: {
    bg: "#ffffff",
    "bg-input": "#f4f4f5",
    border: "#e4e4e7",
    "border-subtle": "#f0f0f1",
    text: "#18181b",
    muted: "#71717a",
    icon: "#71717a",
    sub: "#71717a",
    placeholder: "#a1a1aa",
    hover: "rgba(0,0,0,.04)",
    "hover-strong": "rgba(0,0,0,.06)",
    "text-strong": "#000",
    glass: "rgba(255,255,255,.8)",
    "glass-border": "rgba(0,0,0,.08)",
    "glass-inset": "rgba(255,255,255,.7)",
    "glass-text": "#18181b",
    "glass-hover": "rgba(244,244,245,.94)",
    track: "#71717a",
    "lost-num": "#e4e4e7",
    lost: "#c2410c",
    shadow: "rgba(0,0,0,.18)",
    pop: "rgba(255,255,255,.98)",
    foot: "rgba(0,0,0,.04)",
    "fw-react": "#087ea4",
    "fw-solid": "#2c4f7c",
    "fw-vue": "#2f9768",
    "fw-svelte": "#e63900",
    "fw-astro": "#9a2fd0",
    "fw-jsx": "#71717a",
    // code in the agent's messages (GitHub's light palette)
    "tk-tag": "#116329",
    "tk-attr": "#0550ae",
    "tk-str": "#0a3069",
    "tk-kw": "#cf222e",
    "tk-num": "#0550ae",
    "tk-com": "#6e7781",
    "code-bg": "#f6f8fa",
    "code-border": "#d8dee4",
    "code-text": "#1f2328",
  },
};
const vars = (o) =>
  Object.entries(o)
    .map(([k, v]) => `--sn-${k}:${v}`)
    .join(";");

// Spring easing (damping 0.52): ~15% overshoot, settled by the end.
const SPRING =
  "linear(0,.047,.165,.324,.497,.665,.814,.938,1.031,1.095,1.132,1.147,1.144,1.13,1.108,1.082,1.057,1.034,1.014," +
  ".999,.988,.982,.979,.978,.98,.983,.987,.99,.994,.997,.999,1.001,1.002,1.003,1.003,1.003,1.003,1.002,1.002,1.001,1.001)";

// Stylesheet for everything inside the shadow root. The UI was designed under a
// border-box reset, so it's restated here rather than inherited from the page.
export const CSS = [
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
    "display:flex;flex-direction:column;cursor:grab}", // it drags from anywhere but the input and buttons (panel-frame.js)
  ".sn-panel.sn-dragging,.sn-panel.sn-dragging *{cursor:grabbing!important}",
  // Resized (width/height set): the conversation takes the room, or with none,
  // the note input does.
  ".sn-panel.sn-sized .sn-thread{flex:1 1 auto;min-height:0;max-height:none}",
  ".sn-panel.sn-sized:not(:has(.sn-thread)) .sn-compose{flex:1 1 auto;min-height:0}",
  ".sn-panel.sn-sized:not(:has(.sn-thread)) .sn-compose [data-spotnote-input]{align-self:stretch;flex:1 1 auto;max-height:none!important}",
  // The resize grip, in the bottom-right corner.
  `.sn-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;color:${T.textIcon};opacity:.5}`,
  ".sn-resize:hover{opacity:1}",
  ".sn-panel.sn-leaving{animation:sn-pop-out .12s ease-in forwards;pointer-events:none}",
  "@keyframes sn-pop-in{from{opacity:0;transform:scale(.95)}}",
  "@keyframes sn-pop-out{to{opacity:0;transform:scale(.95)}}",
  // The note's send action: a quiet "↵ Add & copy" under the input, hidden
  // until there's text to send.
  // The input and its "↵ Add & copy" share a row: the hint sits at the right,
  // on the input's last line, so an empty input leaves no gap below it.
  ".sn-compose{display:flex;align-items:flex-end;gap:8px;padding:10px 12px}",
  ".sn-compose [data-spotnote-input]{flex:1;min-width:0;cursor:text}",
  `.sn-send{flex:none;display:flex;align-items:center;gap:6px;margin:0;padding:1px 4px;border:none;border-radius:5px;` +
    `background:none;color:${T.textMuted};font:12px ${T.font};cursor:pointer;transition:opacity .14s,color .14s}`,
  `.sn-send:hover{color:${T.accentText}}`,
  // confirm.js: a question over the dimmed panel or notes list, which grows to
  // hold it. Every property set, so the launcher's own button styles can't leak in.
  ".sn-confirming{min-height:150px}",
  ".sn-confirm{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;padding:12px;" +
    "border-radius:inherit;background:rgba(0,0,0,.42);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:sn-fade .14s ease-out}",
  `.sn-confirm-card{box-sizing:border-box;width:100%;max-width:272px;padding:16px 16px 14px;border:1px solid ${T.border};border-radius:10px;` +
    `background:${T.bg};box-shadow:0 1px 2px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.32);font-family:${T.font};text-align:left;cursor:default;` +
    "animation:sn-rise .16s cubic-bezier(.2,.9,.3,1)}",
  `.sn-confirm-title{margin:0;font:600 13px/18px ${T.font};color:${T.text}}`,
  `.sn-confirm-body{margin:4px 0 0;font:12px/17px ${T.font};color:${T.textMuted}}`,
  ".sn-confirm-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}",
  `.sn-confirm .sn-confirm-btns button{box-sizing:border-box;height:28px;margin:0;padding:0 12px;border:1px solid transparent;border-radius:6px;` +
    `font:500 12px/1 ${T.font};letter-spacing:0;cursor:pointer;transition:background .12s,border-color .12s}`,
  `.sn-confirm .sn-confirm-btns .sn-confirm-no{background:var(--sn-hover);border-color:${T.border};color:${T.text}}`,
  ".sn-confirm .sn-confirm-btns .sn-confirm-no:hover{background:var(--sn-hover-strong)}",
  ".sn-confirm .sn-confirm-btns .sn-confirm-yes{background:#dc2626;border-color:#dc2626;color:#fff}",
  ".sn-confirm .sn-confirm-btns .sn-confirm-yes:hover{background:#c81e1e;border-color:#c81e1e}",
  `.sn-confirm .sn-confirm-btns button:focus-visible{outline:2px solid ${T.border};outline-offset:2px}`,
  ".sn-confirm .sn-confirm-btns .sn-confirm-yes:focus-visible{outline-color:rgba(220,38,38,.5)}",
  "@keyframes sn-fade{from{opacity:0}}",
  "@keyframes sn-rise{from{opacity:0;transform:translateY(4px) scale(.98)}}",
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
  // A line down the left of each message's text (not its "You" / agent label):
  // grey for yours, the accent for the agent's.
  `.sn-msg{color:${T.text};font:13px/18px ${T.font};white-space:pre-wrap;word-break:break-word}`,
  `.sn-msg-body{display:block;margin:2px 0 0 4px;padding-left:8px;border-left:2px solid ${T.border}}`,
  `.sn-msg-agent .sn-msg-body{border-left-color:${T.accent}}`,
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
  ".sn-glue{white-space:nowrap}",
  `.sn-offline{display:flex;align-items:center;gap:6px;font:11px/16px ${T.font};color:${T.textMuted}}`,
  `.sn-offline::before{content:'';width:6px;height:6px;border-radius:50%;background:${T.textMuted};opacity:.6}`, // a grey status dot // a chip or link with the punctuation after it
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
  ".sn-file-hint{display:inline-grid;place-items:center;vertical-align:-2px;margin-left:4px;color:#f59e0b;cursor:help;border-radius:3px;outline:none}",
  `.sn-file-hint:focus-visible{box-shadow:0 0 0 2px ${T.accent}}`,
  `.sn-tip{position:fixed;z-index:2147483647;width:max-content;max-width:220px;padding:6px 8px;border-radius:6px;background:var(--sn-pop);color:var(--sn-glass-text);border:1px solid var(--sn-glass-border);` +
    `font:400 11px/15px ${T.font};pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.25);animation:sn-fade .12s ease-out}`,
  // The panel header's file:line: a button that opens it in your editor.
  `.sn-loc{all:unset;display:inline-flex;align-items:center;align-self:center;flex-shrink:0;cursor:pointer;color:${T.textMuted};font:11px ${T.mono};border-radius:4px}`,
  `.sn-loc:hover{color:${T.text}}`,
  // Dotted like the file links in the agent's messages; solid on hover.
  ".sn-loc span>span:last-child{text-decoration:underline dotted;text-underline-offset:2px}",
  ".sn-loc:hover span>span:last-child{text-decoration-style:solid}",
  `.sn-loc:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}`,
  // The panel header's chips: one per element on the note.
  ".sn-chips{display:flex;flex-wrap:wrap;gap:6px;min-width:0;padding:1px 0}",
  `.sn-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;min-width:0;height:26px;padding:0 10px;border-radius:6px;` +
    `background:var(--sn-hover);border:1px solid ${T.borderSubtle};cursor:pointer}`,
  `.sn-chip-base{border-color:${T.border}}`,
  `.sn-chip-el{display:inline-flex;align-items:baseline;min-width:0;color:${T.text};font-size:12px}`,
  ".sn-chip-el b{font-weight:600;font-size:13px}",
  `.sn-chip-cls{color:${T.textMuted};min-width:0;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
  `.sn-chip-rm{all:unset;display:inline-flex;cursor:pointer;color:${T.textMuted};margin-left:2px;border-radius:4px}`,
  `.sn-chip-rm:hover{color:${T.text}}`,
  ".sn-chip-rm svg{width:12px;height:12px}",
  `.sn-chip-rm:focus-visible{outline:2px solid ${T.accent};outline-offset:2px}`,
  // Settings → Editor
  ".snl-select{appearance:none;-webkit-appearance:none;font:inherit;font-size:13px;color:var(--sn-glass-text);background:none;border:none;" +
    "padding:4px 18px 4px 6px;margin-right:-4px;border-radius:6px;cursor:pointer;text-align:right;" +
    "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M7 10l5 5 5-5'/%3E%3C/svg%3E\");" +
    "background-repeat:no-repeat;background-position:right 2px center}",
  ".snl-select:hover{background-color:var(--sn-hover-strong)}",
  ".snl-select option{color:initial}",
  `.sn-who{display:flex;align-items:center;gap:5px;font-size:11px;line-height:16px;color:${T.textMuted}}`,
  ".sn-agent-mark{display:inline-grid;color:var(--sn-text)}",
  // The agent's message while it works: its words pulse gently, dots move.
  ".sn-thinking-text{color:var(--sn-muted);animation:sn-pulse 1.6s ease-in-out infinite}",
  ".sn-thinking-text::after{content:'';display:inline-block;width:1.2em;text-align:left;animation:sn-dots 1.2s steps(4) infinite}",
  "@keyframes sn-pulse{50%{color:color-mix(in srgb,var(--sn-muted) 55%,transparent)}}", // the text only, not the line
  "@keyframes sn-dots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}",
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
  // Closed, the mark; open, it turns away and the × turns in.
  ".snl-plus{opacity:0;transform:rotate(45deg) scale(.6)}",
  '.snl[data-open="true"] .snl-plus{opacity:1;transform:rotate(135deg)}',
  '.snl[data-open="true"] .snl-logo{opacity:0;transform:rotate(-45deg) scale(.6)}',
  // The core's colour is the mode: accent = selecting, glass = paused / closed.
  `.snl[data-open="true"][data-paused="false"] .snl-core{background:${T.accent};color:${T.accentInk};border-color:transparent;` +
    `box-shadow:0 0 0 6px rgba(${T.accentRgb},.38),0 10px 28px rgba(0,0,0,.28)}`,
  ".snl-check{opacity:0;transform:scale(.4)}",
  ".snl-done .snl-plus,.snl-done .snl-logo{opacity:0}",
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
  // A circle for one digit (border-box: the border counts), a pill for more.
  `.snl-badge{position:absolute;top:-5px;right:-5px;box-sizing:border-box;display:grid;place-items:center;min-width:20px;height:20px;padding:0 4px;` +
    `border-radius:10px;background:${T.accent};color:${T.accentInk};font:600 11px/1 ${T.font};font-variant-numeric:tabular-nums;border:2px solid var(--sn-bg)}`,
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
    "border-top:1px solid var(--sn-glass-border);font:500 11px/16px " +
    T.font +
    ";color:var(--sn-sub);cursor:default;" +
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
  ".snl .snl-del{padding:3px 8px;border:none;border-radius:6px;background:none;color:var(--sn-sub);font:500 12px " +
    T.font +
    ";cursor:pointer}",
  ".snl .snl-del:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  // A trash icon like the other header icons, wider with a "(n)".
  ".snl .snl-del{display:flex;align-items:center;justify-content:center;gap:3px;min-width:28px;height:28px;margin-right:-6px;padding:0 7px;border-radius:7px}",
  ".snl-del-n{font-variant-numeric:tabular-nums}",
  `.snl-src{display:flex;min-width:0;font:12px ${T.mono};white-space:nowrap}`,
  ".snl-src{align-items:center;gap:5px}",
  ".snl-fw{display:inline-flex;flex:none}",
  // The note line starts past the pin number: 16px + the 5px gap.
  ".snl-txt{padding-left:21px}",
  // The note's elements: the panel's chips, smaller, and only to read (the row opens the note).
  `.snl-chips{flex:1 1 auto;flex-wrap:nowrap;padding:0;gap:4px;font-family:${T.font}}`,
  ".snl-chips .sn-chip{height:22px;padding:0 7px;gap:5px;cursor:inherit}",
  `.snl-more{flex:none;color:${T.textMuted};font:500 11px ${T.font}}`,
  `.snl-loc{color:${T.textMuted};font:11px ${T.mono};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
  ".snl-txt{font-size:12px;color:var(--sn-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".snl-empty{margin:4px 8px 10px;font-size:12px;color:var(--sn-sub);line-height:1.5}",
  // A note an agent resolved over MCP: a check instead of its number, and its summary.
  ".snl-dismissed .snl-num{background:var(--sn-lost-num);color:var(--sn-sub)}",
  // Working: the same spinner as on its pin, on a faint track.
  `.snl-working .snl-num{position:relative;background:none;box-shadow:inset 0 0 0 1.5px rgba(${T.accentRgb},.3);color:var(--sn-accent-text)}`,
  `.snl-working .snl-num::after{content:"";position:absolute;inset:0;border-radius:50%;border:1.5px solid transparent;` +
    `border-top-color:${T.accent};animation:sn-spin .9s linear infinite}`,
  ".snl-done .snl-num{background:none;color:var(--sn-accent-text)}", // just the check, no ring
  ".snl-done .snl-num svg{width:14px;height:14px}", // as big as the ring was, so it reads on its own
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
  ".snl .snl-back{margin:0 -4px 0 -11px}", // its chevron lines up with the rows below (beats `.snl button`)
  // Footer: version and GitHub, centred on a darker band across the panel's
  // bottom (the negative margins undo the panel's padding).
  ".snl-foot{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;margin:6px -14px -10px;" +
    "border-top:1px solid var(--sn-glass-border);border-radius:0 0 12px 12px;background:var(--sn-foot);font-size:11px;color:var(--sn-sub)}",
  ".snl-foot .snl-icon-btn{width:22px;height:22px;margin:0;border-radius:6px}",
  ".snl-ver{color:inherit;text-decoration:underline dotted;text-underline-offset:2px}", // like the file links
  ".snl-ver:hover{color:var(--sn-glass-text)}",
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
    `background:var(--sn-pop);color:var(--sn-glass-text);border:1px solid var(--sn-glass-border);font:400 11px/15px ${T.font};text-align:left;pointer-events:none;` +
    "box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transform:translate(-50%,2px);transition:opacity .12s ease,transform .12s ease;z-index:2}",
  ".snl-help:hover .snl-help-tip,.snl-help:focus-visible .snl-help-tip{opacity:1;transform:translate(-50%,0)}",
  ".snl-swatches{display:flex;gap:7px}",
  ".snl-swatches button{width:18px;height:18px;padding:0;border-radius:50%;border:none;background:var(--c);cursor:pointer;" +
    "box-shadow:0 0 0 2px transparent;transition:box-shadow .12s ease,transform .12s ease}",
  ".snl-swatches button:hover{transform:scale(1.08)}",
  '.snl-swatches button[aria-checked="true"]{box-shadow:0 0 0 2px var(--sn-pop),0 0 0 4px var(--c)}',
  // MCP: status with a dot; its page explains and shows the command.
  ".snl-mcp{display:inline-flex;align-items:center;gap:7px}",
  ".snl-dot{width:7px;height:7px;border-radius:50%;background:var(--sn-sub)}",
  ".snl-mcp-on .snl-dot{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}",
  `.snl-mcp-connecting .snl-dot{background:${T.accent};animation:snl-blink 1s ease-in-out infinite}`,
  "@keyframes snl-blink{50%{opacity:.3}}",
  ".snl-mcp-off{color:var(--sn-sub)}",
  ".snl-agent{padding:4px 0 8px}",
  ".snl-para{margin:4px 0 0;font-size:12px;line-height:17px}",
  // The steps to connect: a numbered rail, each step's line, then what to copy.
  ".snl-steps{list-style:none;margin:14px 0 0;padding:0;counter-reset:snl-step;display:flex;flex-direction:column;gap:14px}",
  ".snl-steps li{position:relative;padding-left:28px;counter-increment:snl-step}",
  ".snl-steps li::before{content:counter(snl-step);position:absolute;left:0;top:0;display:grid;place-items:center;width:18px;height:18px;box-sizing:border-box;" +
    "border:1px solid var(--sn-glass-border);border-radius:50%;font:600 10px/1 " +
    T.font +
    ";color:var(--sn-sub);font-variant-numeric:tabular-nums}",
  ".snl-steps li:not(:last-child)::after{content:'';position:absolute;left:8.5px;top:22px;bottom:-10px;width:1px;background:var(--sn-glass-border)}", // the rail
  ".snl-step-text{margin:0;font-size:12px;line-height:18px;color:var(--sn-glass-text)}",
  ".snl-steps .snl-cmd{margin-top:6px}",
  `.snl-cmd{display:flex;align-items:center;gap:4px;margin-top:8px;padding:5px 4px 5px 10px;border:1px solid var(--sn-glass-border);border-radius:8px;background:var(--sn-hover)}`,
  `.snl-cmd code{flex:1;min-width:0;font:11px/16px ${T.mono};color:var(--sn-glass-text);overflow-wrap:anywhere}`,
  ".snl-cmd button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:none;color:var(--sn-sub);cursor:pointer}",
  ".snl-cmd button:hover{background:var(--sn-hover-strong);color:var(--sn-glass-text)}",
  ".snl-seg{display:flex;padding:2px;border-radius:8px;background:var(--sn-hover-strong)}",
  ".snl-seg button{padding:3px 9px;border:none;border-radius:6px;background:none;font-size:12px;cursor:pointer;color:var(--sn-sub)}",
  ".snl-seg button:hover{color:var(--sn-glass-text)}",
  '.snl-seg button[aria-checked="true"]{background:var(--sn-bg);color:var(--sn-glass-text);box-shadow:0 1px 2px rgba(0,0,0,.2)}',
  "@media (prefers-reduced-motion:reduce){.sn-hover,.sn-hover-label{transition:none}" +
    ".sn-panel,.sn-panel.sn-leaving,.sn-pin,.sn-pin.sn-leaving,.sn-pin.sn-asked,.sn-pin.sn-working::after,.sn-thinking-text,.sn-thinking-text::after,.sn-confirm,.sn-confirm-card{animation:none}" +
    ".snl,.snl *,.snl-working .snl-num::after{transition-duration:.01s!important;animation:none!important}}",
].join("\n");
