// Launcher — a core button parked in a viewport corner. Opening it starts
// selection mode and fans three items out clockwise along a quarter arc that
// points into the page (pause · notes · settings); closing ends both.
// Drag the core to move it: on release it snaps to the nearest corner and the
// fan re-aims. The corner is remembered; the open state is not (it always
// starts closed, so a reload never lands the page in selection mode).
//
// Driven by a controller from the inspector:
//   { toggleInspect, setInspect, isInspecting, setPinsVisible, notes, openNote,
//     copyNote, deleteNote, fileKind, mcpStatus, about, onChange }
import { uiRoot, el } from "./ui.ts";
import { LAUNCHER_ICONS } from "./icons.ts";
import { createLayer } from "./layers.ts";
import { createNotesList } from "./notes-list.ts";
import { createSettingsMenu } from "./settings-menu.ts";
import type { Controller } from "./types.ts";

const CORNER_KEY = "data-spotnote-launcher-corner";
const INSET = 44; // core centre ↔ viewport edges
// Fan start angle per corner (screen coords, y down, so +angle = clockwise).
// The fan sweeps +90° from here, which always points into the page.
type Corner = "bl" | "br" | "tr" | "tl";
const START: Record<Corner, number> = { bl: -90, br: 180, tr: 90, tl: 0 };

export function mountLauncher(ctrl: Controller): { flash(): void; open(): void } {
  const root = el("div", "snl", uiRoot());
  let corner: Corner = "bl";
  try {
    const saved = localStorage.getItem(CORNER_KEY);
    if (saved && saved in START) corner = saved as Corner;
  } catch {
    /* ignore */
  }
  let open = false;

  // The quarter arc the items ride on.
  const NS = "http://www.w3.org/2000/svg";
  const track = document.createElementNS(NS, "svg");
  track.setAttribute("class", "snl-track");
  track.setAttribute("aria-hidden", "true");
  const arc = document.createElementNS(NS, "circle");
  track.append(arc);
  root.append(track);

  // Items, in clockwise order (--i places them on the arc).
  const item = (i: number, icon: string, tip: string, onClick?: () => void) => {
    const b = el("button", "snl-item snl-glass", root);
    b.style.setProperty("--i", String(i));
    b.tabIndex = -1; // reachable only while open
    const ic = el("span", "snl-ic", b);
    ic.innerHTML = icon; // hardcoded SVG constants, not user input
    const t = el("span", "snl-tip snl-glass", b);
    t.textContent = tip;
    if (onClick) b.addEventListener("click", onClick);
    return { b, ic, t };
  };
  const pause = item(0, LAUNCHER_ICONS.pause, "Pause selecting", () => ctrl.toggleInspect());
  const notes = item(1, LAUNCHER_ICONS.notes, "Notes", () => togglePop(notesPop));
  const badge = el("span", "snl-badge", notes.b);
  const gear = item(2, LAUNCHER_ICONS.gear, "Settings", () => togglePop(settingsPop));

  const core = el("button", "snl-core snl-glass", root);
  core.innerHTML = LAUNCHER_ICONS.mark + LAUNCHER_ICONS.plus + LAUNCHER_ICONS.check;

  // `item`: the button that opens it.
  const popover = (cls: string, label: string, item: HTMLButtonElement) => {
    const p = el("div", `snl-pop ${cls} snl-glass`, root);
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", label);
    return Object.assign(p, { item });
  };
  const notesPop = popover("snl-notes", "Notes", notes.b);
  const notesList = createNotesList(notesPop, ctrl, { onOpen: () => togglePop(null) });
  const settingsPop = popover("snl-settings", "Settings", gear.b);
  const settingsMenu = createSettingsMenu(settingsPop, ctrl);

  // ── Geometry ──
  function place(animate: boolean) {
    root.classList.toggle("snl-no-anim", !animate);
    root.style.setProperty("--x", (corner[1] === "l" ? INSET : innerWidth - INSET) + "px");
    root.style.setProperty("--y", (corner[0] === "t" ? INSET : innerHeight - INSET) + "px");
    root.style.setProperty("--start", START[corner] + "deg");
    root.dataset.corner = corner;
    if (!animate) {
      root.getBoundingClientRect(); // flush, so the jump lands before transitions return
      root.classList.remove("snl-no-anim");
    }
  }
  function drawTrack() {
    const r = parseFloat(getComputedStyle(root).getPropertyValue("--r"));
    const s = r + 2;
    track.setAttribute("width", String(2 * s));
    track.setAttribute("height", String(2 * s));
    track.style.left = track.style.top = -s + "px";
    arc.setAttribute("cx", String(s));
    arc.setAttribute("cy", String(s));
    arc.setAttribute("r", String(r));
    root.style.setProperty("--C", (2 * Math.PI * r).toFixed(2));
  }

  // ── State → UI ──
  let shownSelecting: boolean | null = null;
  let shownCount = 0;
  function render() {
    const selecting = ctrl.isInspecting();
    root.dataset.open = String(open);
    root.dataset.paused = String(!selecting);
    const label = open ? "Close Spotnote" : "Open Spotnote";
    core.setAttribute("aria-expanded", String(open));
    core.setAttribute("aria-label", label);
    core.title = label;
    if (selecting !== shownSelecting) {
      shownSelecting = selecting;
      pause.ic.innerHTML = selecting ? LAUNCHER_ICONS.pause : LAUNCHER_ICONS.play;
      pause.t.textContent = selecting ? "Pause selecting" : "Resume selecting";
      pause.b.setAttribute("aria-pressed", String(!selecting));
    }
    root.querySelectorAll<HTMLElement>(".snl-item").forEach((b) => (b.tabIndex = open ? 0 : -1));
    const count = ctrl.notes().length;
    if (count !== shownCount) {
      badge.textContent = count ? String(count) : "";
      if (count > shownCount) {
        badge.classList.remove("snl-bump");
        badge.getBoundingClientRect(); // restart the animation
        badge.classList.add("snl-bump");
      }
      shownCount = count;
    }
    if (notesPop.classList.contains("snl-show")) notesList.render();
    if (settingsPop.classList.contains("snl-show")) settingsMenu.refreshStatus();
  }

  function setOpen(v: boolean) {
    open = v;
    if (!v) togglePop(null);
    ctrl.setPinsVisible(v);
    ctrl.setInspect(v); // open = selecting, closed = not
    render();
  }

  // ── Popovers: at most one open; togglePop(null) closes it ──
  // The open one is a light-dismiss layer (layers.ts): it stacks with the note
  // panel, Esc closes it, and a press on the page closes it.
  const menuLayer = createLayer({ close: () => togglePop(null), lightDismiss: true });
  function togglePop(which: HTMLElement | null) {
    let shown: HTMLElement | null = null;
    for (const p of [notesPop, settingsPop]) {
      const show = p === which && !p.classList.contains("snl-show");
      p.classList.toggle("snl-show", show);
      if (!show && p.classList.contains("sn-confirming")) {
        // An open question goes with it.
        p.querySelector(".sn-confirm")?.remove();
        p.classList.remove("sn-confirming");
      }
      p.item.setAttribute("aria-expanded", String(show));
      if (show) (p === notesPop ? notesList.render : settingsMenu.open)();
      if (show) shown = p;
    }
    // The launcher root is the popovers' stacking context, so it takes the z-index.
    if (shown) menuLayer.show(root, shown);
    else menuLayer.hide();
  }
  // ── Core: click toggles; a drag moves it and snaps to the nearest corner ──
  let drag: { sx: number; sy: number; moved: boolean } | null = null;
  let justDragged = false;
  core.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { sx: e.clientX, sy: e.clientY, moved: false };
    core.setPointerCapture(e.pointerId);
  });
  core.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    drag.moved = true;
    root.classList.add("snl-dragging");
    togglePop(null);
    root.style.setProperty("--x", e.clientX + "px");
    root.style.setProperty("--y", e.clientY + "px");
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    root.classList.remove("snl-dragging");
    if (!moved) return;
    // Swallow the click this drag ends with.
    justDragged = true;
    setTimeout(() => (justDragged = false), 0);
    corner = (e.clientY < innerHeight / 2 ? "t" : "b") + (e.clientX < innerWidth / 2 ? "l" : "r");
    try {
      localStorage.setItem(CORNER_KEY, corner);
    } catch {
      /* ignore */
    }
    place(true);
  };
  core.addEventListener("pointerup", endDrag);
  core.addEventListener("pointercancel", endDrag);
  core.addEventListener("click", () => {
    if (!justDragged) setOpen(!open);
  });

  addEventListener("resize", () => place(false));

  // A brief ✓ on the core after a copy.
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  function flash() {
    core.classList.add("snl-done");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => core.classList.remove("snl-done"), 1200);
  }

  ctrl.onChange(render);
  place(false);
  drawTrack();
  setOpen(false);
  return { flash, open: () => setOpen(true) };
}
