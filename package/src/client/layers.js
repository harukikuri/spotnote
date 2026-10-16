// Floating surfaces — the note panel, and the launcher's Notes and Settings —
// in one place: how they stack, which one Esc closes, and what a press outside
// them does.
//
//   const layer = createLayer({ close, lightDismiss })
//   layer.show(el, hit)  onto the stack, on top. `el` is what gets the z-index
//                        (its stacking context); `hit`, what counts as "on the
//                        layer" for presses (defaults to `el`).
//   layer.swap(el, hit)  same place in the stack, new element (a rebuild)
//   layer.hide()         off the stack
//
// Stacking: the surface you last pressed (or opened) is on top.
// Esc: closeTopLayer() closes the top one; false when there's none.
// A press on the page, outside every layer, closes the light-dismiss ones (the
// menus), and that's all it does: the click doesn't pick an element or follow
// a link. Spotnote's own UI (a pin, the launcher) isn't "outside": pressing it
// leaves the menus open.
import { uiRoot } from "./ui.js";

// Layers take the top z-indices, the topmost layer the highest; everything
// else of ours sits below (see the stacking note in ui.js).
const TOP = 2147483647;

const stack = []; // bottom → top

function restack() {
  stack.forEach((l, i) => (l.el.style.zIndex = String(TOP - (stack.length - 1 - i))));
}

export function createLayer({ close, lightDismiss = false }) {
  const layer = {
    el: null,
    hit: null,
    close,
    lightDismiss,
    show(el, hit = el) {
      Object.assign(layer, { el, hit });
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      stack.push(layer);
      restack();
    },
    swap(el, hit = el) {
      if (!stack.includes(layer)) return layer.show(el, hit);
      Object.assign(layer, { el, hit });
      restack();
    },
    hide() {
      const i = stack.indexOf(layer);
      if (i < 0) return;
      stack.splice(i, 1);
      layer.el.style.zIndex = "";
      restack();
    },
  };
  return layer;
}

export function closeTopLayer() {
  const top = stack.at(-1);
  if (!top) return false;
  top.close();
  return true;
}

let swallowClick = false;
addEventListener(
  "pointerdown",
  (e) => {
    swallowClick = false;
    const path = e.composedPath();
    const pressed = stack.findLast((l) => path.includes(l.hit));
    if (pressed) {
      if (pressed !== stack.at(-1)) pressed.show(pressed.el, pressed.hit); // to the top
      return;
    }
    const menus = stack.filter((l) => l.lightDismiss);
    if (!menus.length || path.includes(uiRoot().host)) return;
    menus.forEach((l) => l.close());
    swallowClick = true;
    e.preventDefault(); // also suppresses the mousedown that would follow
    e.stopPropagation();
  },
  true,
);
addEventListener(
  "click",
  (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  true,
);
