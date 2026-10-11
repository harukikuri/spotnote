// Launcher — a core button parked in a viewport corner. Opening it starts
// selection mode and fans three items out clockwise along a quarter arc that
// points into the page (pause · notes · settings); closing ends both.
// Drag the core to move it: on release it snaps to the nearest corner and the
// fan re-aims. The corner is remembered; the open state is not (it always
// starts closed, so a reload never lands the page in selection mode).
//
// Driven by a controller from the inspector:
//   { toggleInspect, setInspect, isInspecting, setPinsVisible, notes, openNote,
//     copyNote, deleteNote, fileKind, onChange }
import { ICONS, ACCENTS, FRAMEWORKS, fwIcon, uiRoot } from "./ui.js";
import { getSettings, setSetting } from "./settings.js";

const CORNER_KEY = "data-spotnote-launcher-corner";
const INSET = 44; // core centre ↔ viewport edges
// Fan start angle per corner (screen coords, y down, so +angle = clockwise).
// The fan sweeps +90° from here, which always points into the page.
const START = { bl: -90, br: 180, tr: 90, tl: 0 };

const svg = (attrs, body) => `<svg width="18" height="18" viewBox="0 0 24 24" ${attrs}>${body}</svg>`;
const LINE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  // Rotated 135° when open, the "+" reads as "×".
  plus: svg('class="snl-plus" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"', '<path d="M12 5v14M5 12h14"/>'),
  check: svg('class="snl-check" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  pause: svg('fill="currentColor"', '<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>'),
  play: svg('fill="currentColor"', '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>'),
  notes: svg(LINE, '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
  gear: svg(
    LINE,
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  ),
};

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.append(e);
  return e;
}

export function mountLauncher(ctrl) {
  const root = el("div", "snl", uiRoot());
  let corner = "bl";
  try {
    const saved = localStorage.getItem(CORNER_KEY);
    if (saved in START) corner = saved;
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
  const item = (i, icon, tip, onClick) => {
    const b = el("button", "snl-item snl-glass", root);
    b.style.setProperty("--i", i);
    b.tabIndex = -1; // reachable only while open
    const ic = el("span", "snl-ic", b);
    ic.innerHTML = icon; // hardcoded SVG constants, not user input
    const t = el("span", "snl-tip snl-glass", b);
    t.textContent = tip;
    if (onClick) b.addEventListener("click", onClick);
    return { b, ic, t };
  };
  const pause = item(0, ICON.pause, "Pause selecting", () => ctrl.toggleInspect());
  const notes = item(1, ICON.notes, "Notes", () => togglePop(notesPop));
  const badge = el("span", "snl-badge", notes.b);
  const gear = item(2, ICON.gear, "Settings", () => togglePop(settingsPop));

  const core = el("button", "snl-core snl-glass", root);
  core.innerHTML = ICON.plus + ICON.check;

  const popover = (cls, label) => {
    const p = el("div", `snl-pop ${cls} snl-glass`, root);
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", label);
    return p;
  };
  const notesPop = popover("snl-notes", "Notes");
  notesPop.item = notes.b;
  const popTitle = el("h4", "", notesPop);
  const list = el("ol", "", notesPop);
  const empty = el("p", "snl-empty", notesPop);
  const settingsPop = popover("snl-settings", "Settings");
  settingsPop.item = gear.b;
  el("h4", "", settingsPop).textContent = "Settings";
  empty.textContent = "No notes yet. Click an element on the page to add one.";

  // ── Geometry ──
  function place(animate) {
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
    track.setAttribute("width", 2 * s);
    track.setAttribute("height", 2 * s);
    track.style.left = track.style.top = -s + "px";
    arc.setAttribute("cx", s);
    arc.setAttribute("cy", s);
    arc.setAttribute("r", r);
    root.style.setProperty("--C", (2 * Math.PI * r).toFixed(2));
  }

  // ── State → UI ──
  let shownSelecting = null;
  let shownCount = 0;
  function render() {
    const selecting = ctrl.isInspecting();
    root.dataset.open = open;
    root.dataset.paused = !selecting;
    const label = open ? "Close Spotnote" : "Open Spotnote";
    core.setAttribute("aria-expanded", open);
    core.setAttribute("aria-label", label);
    core.title = label;
    if (selecting !== shownSelecting) {
      shownSelecting = selecting;
      pause.ic.innerHTML = selecting ? ICON.pause : ICON.play;
      pause.t.textContent = selecting ? "Pause selecting" : "Resume selecting";
      pause.b.setAttribute("aria-pressed", !selecting);
    }
    root.querySelectorAll(".snl-item").forEach((b) => (b.tabIndex = open ? 0 : -1));
    const count = ctrl.notes().length;
    if (count !== shownCount) {
      badge.textContent = count || "";
      if (count > shownCount) {
        badge.classList.remove("snl-bump");
        badge.getBoundingClientRect(); // restart the animation
        badge.classList.add("snl-bump");
      }
      shownCount = count;
    }
    if (notesPop.classList.contains("snl-show")) renderNotes();
  }

  function setOpen(v) {
    open = v;
    if (!v) togglePop(null);
    ctrl.setPinsVisible(v);
    ctrl.setInspect(v); // open = selecting, closed = not
    render();
  }

  // ── Popovers: at most one open; togglePop(null) closes it ──
  function togglePop(which) {
    for (const p of [notesPop, settingsPop]) {
      const show = p === which && !p.classList.contains("snl-show");
      p.classList.toggle("snl-show", show);
      p.item.setAttribute("aria-expanded", show);
      if (show) (p === notesPop ? renderNotes : renderSettings)();
    }
  }
  function renderNotes() {
    const all = ctrl.notes();
    popTitle.textContent = all.length ? `Notes (${all.length})` : "Notes";
    list.textContent = "";
    all.forEach((n, i) => {
      const li = el("li", [n.lost && "snl-lost", n.state !== "open" && `snl-${n.state}`].filter(Boolean).join(" "), list);
      el("span", "snl-num", li).textContent = n.mark ?? String(i + 1); // same as its pin
      const src = el("span", "snl-src", li);
      const kind = ctrl.fileKind(n.loc.replace(/:\d+:\d+$/, "")); // drop :line:col
      const mark = el("span", "snl-fw", src);
      mark.style.color = FRAMEWORKS[kind].color;
      mark.title = FRAMEWORKS[kind].name;
      mark.innerHTML = fwIcon(kind); // hardcoded SVG constants, not user input
      el("span", "", src).textContent = n.loc.split("/").pop() + (n.index > 0 ? ` · #${n.index + 1}` : "");
      el("span", "snl-txt", li).textContent = n.note;
      if (n.state !== "open") {
        // Where it stands: the agent is on it, or its last word (what it changed,
        // what it's asking, or why it won't).
        const sum = el("span", "snl-sum", li);
        sum.textContent = sum.title = n.state === "working" ? "Agent is on it…" : n.agent;
      }
      if (!n.lost) {
        li.addEventListener("click", () => {
          togglePop(null);
          ctrl.openNote(n.key);
        });
        return;
      }
      // An edit moved or removed its element: it can't be opened, but it can
      // still be copied (the prompt saved when it was written) or deleted.
      el("span", "snl-lost-tag", src).textContent = "Not found";
      const acts = el("span", "snl-acts", li);
      const copy = el("button", "", acts);
      copy.title = "Copy prompt";
      copy.innerHTML = ICONS.copy; // hardcoded SVG constants, not user input
      copy.addEventListener("click", () => {
        ctrl.copyNote(n.key);
        copy.innerHTML = ICONS.check;
        setTimeout(() => (copy.innerHTML = ICONS.copy), 1200);
      });
      const del = el("button", "", acts);
      del.title = "Delete note";
      del.innerHTML = ICONS.trash;
      del.addEventListener("click", () => ctrl.deleteNote(n.key));
    });
    empty.hidden = all.length > 0;
  }
  function closePopover() {
    if (!root.querySelector(".snl-pop.snl-show")) return false;
    togglePop(null);
    return true;
  }

  // ── Settings popover ──
  // A row of mutually exclusive choices; picking one saves it and re-renders.
  function choices(parent, cls, name, options, render) {
    const group = el("div", cls, parent);
    group.setAttribute("role", "radiogroup");
    for (const [value, label] of options) {
      const b = el("button", "", group);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", getSettings()[name] === value);
      render(b, value, label);
      b.addEventListener("click", () => {
        setSetting(name, value);
        renderSettings();
      });
    }
  }
  function row(label) {
    const r = el("div", "snl-row", settingsPop);
    el("span", "snl-lbl", r).textContent = label;
    return r;
  }
  function renderSettings() {
    settingsPop.querySelectorAll(".snl-row").forEach((n) => n.remove());
    choices(row("Color"), "snl-swatches", "accent", Object.entries(ACCENTS).map(([k, a]) => [k, a.name]), (b, k, name) => {
      b.style.setProperty("--c", ACCENTS[k].accent);
      b.title = name;
      b.setAttribute("aria-label", name);
    });
    const seg = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];
    choices(row("Theme"), "snl-seg", "theme", seg, (b, _, label) => (b.textContent = label));
  }

  // ── Core: click toggles; a drag moves it and snaps to the nearest corner ──
  let drag = null;
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
  const endDrag = (e) => {
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
  let flashTimer;
  function flash() {
    core.classList.add("snl-done");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => core.classList.remove("snl-done"), 1200);
  }

  ctrl.onChange(render);
  place(false);
  drawTrack();
  setOpen(false);
  return { flash, open: () => setOpen(true), closePopover };
}
