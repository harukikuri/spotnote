// Spotnote's UI over the page, as the client draws it: its own stylesheet
// (imported from the package, so it's the real one) in a shadow root, and the
// markup copied from the real client (snapshots.js).
//
// It moves with the client's own transitions and animations, played by the
// frame: the UI goes through `steps` (the markup at a frame) the way the client
// changes its DOM, and every transition or animation that starts is paused at
// how long ago its step was, then written down as plain style. Each frame
// rebuilds this from the start, so any frame renders the same on its own.
import { useLayoutEffect, useRef } from "react";
import { CSS } from "../../../package/src/client/styles.js";
import * as snap from "./snapshots.js";

// What applyLook (package/src/client/ui.js) sets for the yellow accent, light theme.
const LOOK = {
  "--sn-accent": "#ffd84d",
  "--sn-accent-rgb": "255,216,77",
  "--sn-ink": "#1a1600",
  "--sn-accent-text": "#8a6a00",
  "--sn-mark": "#ffd84d",
  "--sn-mark-fold": "#d4a817",
};

// steps: [{ at: frame, html }], in order. Top-level elements carry data-k, so
// a step keeps the ones it shares with the last (and their transitions run).
export function Spotnote({ steps, frame, fps }) {
  const host = useRef(null);
  useLayoutEffect(() => {
    const root = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style>`;
    const started = new Map(); // animation -> the frame its step came at
    const seek = (now) => {
      for (const [a, at] of started) a.currentTime = ((now - at) * 1000) / fps;
    };
    for (const { at, html } of steps) {
      if (at > frame) break;
      seek(at); // where everything is when this step changes the DOM
      morphTop(root, html);
      host.current.getBoundingClientRect(); // apply the styles: transitions start
      for (const a of root.getAnimations()) {
        if (started.has(a)) continue;
        a.pause();
        started.set(a, at);
      }
    }
    seek(frame);
    // Transform and opacity run on the compositor, which paints them at its own
    // time, not the paused one: read each animated value where it is, stop the
    // animations, and set the values as plain style.
    const values = [];
    for (const a of started.keys()) {
      const el = a.effect?.target;
      if (!el || a.effect.getComputedTiming().progress == null) continue;
      const props = a.transitionProperty
        ? [a.transitionProperty]
        : a.effect
            .getKeyframes()
            .flatMap((k) =>
              Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p)),
            );
      const style = getComputedStyle(el);
      for (const p of props)
        values.push([el, p, style.getPropertyValue(p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))]);
    }
    for (const a of started.keys()) a.cancel();
    for (const [el, p, v] of values) {
      el.style.transition = "none";
      el.style.animation = "none";
      el.style.setProperty(
        p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
        v,
      );
    }
  });
  return <div ref={host} data-theme="light" style={{ position: "absolute", inset: 0, ...LOOK }} />;
}

// Bring the shadow root's keyed elements in line with `html`: keep the same
// ones (updated in place), add new ones, remove the rest. Moving an element
// would restart its animations, so new ones just go at the end.
function morphTop(root, html) {
  const next = document.createElement("div");
  next.innerHTML = html;
  const have = new Map([...root.children].filter((c) => c.dataset?.k).map((c) => [c.dataset.k, c]));
  for (const el of [...next.children]) {
    const old = have.get(el.dataset.k);
    have.delete(el.dataset.k);
    if (old && old.tagName === el.tagName) morph(old, el);
    else root.append(el);
  }
  for (const gone of have.values()) gone.remove();
}

// Make `a` like `b`, same structure: attributes, then children by position.
function morph(a, b) {
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  const ac = [...a.childNodes];
  const bc = [...b.childNodes];
  bc.forEach((bn, i) => {
    const an = ac[i];
    if (!an) a.append(bn.cloneNode(true));
    else if (an.nodeName !== bn.nodeName) an.replaceWith(bn.cloneNode(true));
    else if (an.nodeType === Node.TEXT_NODE) an.data !== bn.data && (an.data = bn.data);
    else morph(an, bn);
  });
  for (const extra of ac.slice(bc.length)) extra.remove();
}

const fill = (template, values) => template.replace(/{{(\w+)}}/g, (_, k) => values[k] ?? "");
const px = (n) => `${Math.round(n * 10) / 10}px`;
const key = (k, html) => html.replace(/^<(\w+)/, `<$1 data-k="${k}"`);

// The launcher in a corner of a viewport `vh` tall: "closed", "open", "done"
// (the ✓ after copying) or "after" (open, with a note in its badge).
export function launcher(state, vh) {
  const html = {
    closed: snap.launcherClosed,
    open: snap.launcherOpen,
    done: snap.launcherDone,
    after: snap.launcherAfter,
  }[state];
  return key("launcher", html.replace(/--y: \d+px/, `--y: ${vh - 44}px`));
}

// The dashed outline and label over the element under the pointer (shown with
// `on`; they fade in and out).
export function hover({ x, y, w, h }, loc, on) {
  const cls = on ? " sn-on" : "";
  return (
    key(
      "hover",
      `<div class="sn-hover${cls}" style="transform: translate(${px(x)}, ${px(y)}); width: ${px(w)}; height: ${px(h)};"></div>`,
    ) +
    key(
      "label",
      fill(snap.hoverLabel.replace(" sn-on", cls), { loc, style: `transform: translate(${px(x)}, ${px(y - 24)});` }),
    )
  );
}

// The solid outline of the element a note is open on.
export function selected({ x, y, w, h }) {
  return key(
    "selected",
    `<div style="position: absolute; pointer-events: none; z-index: 2147483640; box-sizing: border-box; border-radius: 3px; border: 2px solid var(--sn-accent); background: rgba(var(--sn-accent-rgb),0.10); left: ${px(x)}; top: ${px(y)}; width: ${px(w)}; height: ${px(h)};"></div>`,
  );
}

// The note panel under an element, with `text` typed so far (and a caret after
// it); its send button shows once there's text. `leaving`: closing.
const CARET = '<span style="border-left: 1.5px solid currentColor; margin-left: 1px;"></span>';
export function panel({ x, y }, loc, text, leaving) {
  let html = text ? snap.panel.replace(' disabled=""', "") : snap.panel;
  if (leaving) html = html.replace('class="sn-panel"', 'class="sn-panel sn-leaving"');
  return key(
    "panel",
    fill(html, {
      loc,
      text: text && text + CARET,
      style: `left: ${px(x)}; top: ${px(y)}; transform-origin: 150px 0px;`,
    }),
  );
}

// A note's numbered pin at an element's top-left corner.
export function pin({ x, y }) {
  return key("pin", fill(snap.pin, { style: `left: ${px(x - 11)}; top: ${px(y - 11)};` }));
}
