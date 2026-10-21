// What's drawn over the page around elements: the hover box and its label
// (tag.class, then the file), and the selection box on the open panel's element.
import { uiRoot } from "./ui.ts";
import { T } from "./styles.ts";
import { FRAMEWORKS, fwIcon } from "./icons.ts";
import { parseLoc } from "./prompt.ts";
import { app, selection } from "./state.ts";
import type { FileKind } from "./types.ts";

const ACCENT = T.accent;
export const ACCENT_RGB = T.accentRgb;
const MONO = T.mono;

let hoverBox: HTMLDivElement | null = null;
let hoverLabel: HTMLDivElement | null = null;
let hoverTarget: Element | null = null; // element the hover box is currently on
let selectBox: HTMLDivElement | null = null;

// The framework mark for a source file: .vue/.svelte/.astro by extension; .jsx/.tsx by
// what the plugin found in the Vite config ("jsx" when it couldn't tell).
export function fileKind(file: string): FileKind {
  if (file.endsWith(".vue")) return "vue";
  if (file.endsWith(".svelte")) return "svelte";
  if (file.endsWith(".astro")) return "astro";
  return app.jsx || "jsx";
}

// [mark] File.jsx:12 — the file part of the hover label and the panel header.
export function fileTag(file: string, line: number, color?: string): HTMLSpanElement {
  const kind = fileKind(file);
  const wrap = document.createElement("span");
  // margin-left: a little extra air after the tag/class, so the file reads as its own group.
  wrap.style.cssText =
    "display:inline-flex;align-items:center;gap:4px;margin-left:4px;white-space:nowrap;flex-shrink:0";
  wrap.title = FRAMEWORKS[kind].name;
  const icon = document.createElement("span");
  icon.style.cssText = `display:inline-flex;color:${color ?? FRAMEWORKS[kind].color}`;
  icon.innerHTML = fwIcon(kind); // hardcoded SVG constants, not user input
  const name = document.createElement("span");
  name.textContent = `${file.split("/").pop()}:${line}`;
  wrap.append(icon, name);
  return wrap;
}

// An element's first class (SVG elements have no string className).
export const firstClass = (el: Element): string =>
  typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";

// A click/hover on our own UI (launcher, panel, pins) must reach that UI — not
// get resolved "through" it to a page element behind, which would swallow the
// event and, e.g., stop the Inspect toggle from turning off.
export function overOwnUI(e: Event): boolean {
  return e.target instanceof Element && !!e.target.closest("[data-spotnote-ui]");
}

// A box on an element: document coordinates (absolute), so it rides page
// scroll natively with no lag.
export function mkBox(): HTMLDivElement {
  const box = document.createElement("div");
  box.setAttribute("data-spotnote-ui", "");
  // z-index: under pins (see the stacking note in ui.ts).
  box.style.cssText =
    "position:absolute;pointer-events:none;z-index:2147483640;box-sizing:border-box;border-radius:3px;" +
    `border:2px solid ${ACCENT};background:rgba(${ACCENT_RGB},0.10)`;
  return box;
}

// tag (strong) + .class (muted), written together like a selector, then
// file:line (muted mono).
function setLabel(labelEl: HTMLElement, el: Element) {
  labelEl.textContent = "";
  const tag = document.createElement("span");
  tag.textContent = el.tagName.toLowerCase();
  labelEl.appendChild(tag);

  const cls = firstClass(el);
  if (cls) {
    const c = document.createElement("span");
    c.style.opacity = "0.6"; // the label's ink, faded
    c.textContent = "." + cls;
    tag.appendChild(c);
  }

  // On the accent label the mark stays in the label's ink, not brand colour.
  const l = parseLoc(el.getAttribute("data-spotnote") ?? "");
  const loc = fileTag(l.file, l.line, "inherit");
  loc.style.opacity = "0.75";
  loc.style.fontFamily = MONO;
  loc.style.fontWeight = "400";
  labelEl.appendChild(loc);
}

// Document coords — for absolute overlays that scroll with the page. During a
// page scroll (rect.top + scrollY) is constant, so the reposition is a no-op and
// the overlay tracks smoothly; it only recomputes for nested scroll / layout.
export function placeAbs(box: HTMLElement, target: Element): void {
  const r = target.getBoundingClientRect();
  box.style.left = r.left + window.scrollX + "px";
  box.style.top = r.top + window.scrollY + "px";
  box.style.width = r.width + "px";
  box.style.height = r.height + "px";
}

// The hover box + label are created once and slid between targets with
// transform + size transitions, so moving across elements animates instead of
// flickering. A hidden box snaps into place first, then fades in, so it never
// slides in from wherever it was last shown.
export function drawHover(target: Element, animate: boolean): void {
  if (!hoverBox || !hoverLabel) {
    hoverBox = document.createElement("div");
    hoverBox.className = "sn-hover";
    hoverLabel = document.createElement("div");
    hoverLabel.className = "sn-hover-label";
    uiRoot().append(hoverBox, hoverLabel);
  }
  const snap = !animate || !hoverBox.classList.contains("sn-on");
  if (snap) {
    hoverBox.classList.add("sn-snap");
    hoverLabel.classList.add("sn-snap");
  }
  const r = target.getBoundingClientRect();
  hoverBox.style.transform = `translate(${r.left}px,${r.top}px)`;
  hoverBox.style.width = r.width + "px";
  hoverBox.style.height = r.height + "px";
  if (target !== hoverTarget) setLabel(hoverLabel, target);
  hoverLabel.style.transform = `translate(${r.left}px,${Math.max(0, r.top - 24)}px)`;
  hoverTarget = target;
  if (snap) {
    hoverBox.getBoundingClientRect(); // flush, so the snap lands before transitions return
    hoverBox.classList.remove("sn-snap");
    hoverLabel.classList.remove("sn-snap");
  }
  hoverBox.classList.add("sn-on");
  hoverLabel.classList.add("sn-on");
}

export function hideHover(): void {
  hoverBox?.classList.remove("sn-on");
  hoverLabel?.classList.remove("sn-on");
  hoverTarget = null;
}

// The selection box, on the open panel's element.
export function drawSelect(target: Element): void {
  if (!selectBox) {
    selectBox = mkBox();
    uiRoot().append(selectBox);
  }
  placeAbs(selectBox, target);
}

export function removeSelect(): void {
  selectBox?.remove();
  selectBox = null;
}

export function repositionSelect(): void {
  if (selectBox && selection.el?.isConnected) placeAbs(selectBox, selection.el);
}

export const selectBoxEl = (): HTMLDivElement | null => selectBox;
