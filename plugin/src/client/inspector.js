// Framework-agnostic client picker for `data-spotnote`.
// - Inspect via the launcher toggle OR by holding Alt; hover highlights the
//   nearest data-spotnote element, click opens a selection panel.
// - Write a note; "Copy for agent" copies a ready-to-paste prompt (exact source
//   location + element + styles + your note) to the clipboard, and drops a pin.
// - After each HMR update the selection/pins re-bind by exact data-spotnote.
import { T, createButton, createIconBtn, ICONS } from "./ui.js";
import { mountLauncher } from "./launcher.js";

const ACTIVATE_KEY = "Alt";
const ACCENT = T.accent;
const ACCENT_RGB = T.accentRgb;
const FONT = T.font;
const MONO = T.mono;

let active = false; // effective inspect state
let sticky = false; // toggled from the launcher
let altHeld = false; // momentary via Alt
let hoverBox = null;
let hoverLabel = null;
let selectBox = null;
let selectedEl = null;
let selectedLoc = null;
let selectedIndex = 0; // occurrence index among same-loc siblings (.map() items)
let panel = null;
let panelTarget = null; // element the open panel is anchored to
let panelDragged = false; // once dragged, stop re-anchoring it to the target
let launcher = null;
const PINS_KEY = "data-spotnote-pins"; // notes persist across reloads / navigation
const OPEN_KEY = "data-spotnote-open"; // note to auto-open after a cross-page jump
const pins = new Map(); // refKey (loc@index) -> { loc, index, note, url, marker }
let pinsVisible = true; // hidden while the launcher is minimized

const changeCbs = [];
function notify() {
  for (const cb of changeCbs) cb();
}

const controller = {
  toggleInspect() {
    sticky = !sticky;
    syncActive();
    notify();
  },
  isInspecting: () => active,
  // Launcher minimized → hide the pins (and their panel) with it.
  setPinsVisible(visible) {
    pinsVisible = visible;
    if (!visible && panel) closePanel();
    repositionPins();
  },
  notes: () => [...pins.entries()].map(([key, p]) => ({ key, loc: p.loc, index: p.index, note: p.note })),
  openNote: (key) => {
    const p = pins.get(key);
    if (!p) return;
    const el = resolveRef(p.loc, p.index);
    if (el) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      openPanel(el, p.note);
      return;
    }
    // Not on this page — navigate to where the note was made, then reopen it.
    if (p.url && p.url !== pageUrl()) {
      try {
        sessionStorage.setItem(OPEN_KEY, key);
      } catch {
        /* ignore */
      }
      location.href = p.url;
    }
  },
  onChange(cb) {
    changeCbs.push(cb);
    return () => {
      const i = changeCbs.indexOf(cb);
      if (i >= 0) changeCbs.splice(i, 1);
    };
  },
};

export function initInspector() {
  if (window.__spotnote) return; // already booted — guard against a double inject
  window.__spotnote = true;
  injectStyles();

  window.addEventListener("keydown", (e) => {
    if (e.key === ACTIVATE_KEY) {
      altHeld = true;
      syncActive();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === ACTIVATE_KEY) {
      altHeld = false;
      syncActive();
    }
  });
  // If focus leaves the window while Alt is down (Alt+Tab / app switch), the
  // keyup never arrives — clear it so a stranded Alt can't pin inspect mode on.
  window.addEventListener("blur", () => {
    if (altHeld) {
      altHeld = false;
      syncActive();
    }
  });
  // Esc exits selection mode (closes the panel + turns off inspect) and is
  // consumed (capture) so it can't cascade — but only when something is active,
  // so a bare Esc still reaches the page.
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      if (!panel && !active) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (panel) closePanel();
      sticky = false;
      syncActive();
    },
    true,
  );
  window.addEventListener("scroll", scheduleReposition, true);
  window.addEventListener("resize", scheduleReposition);
  // Route changes / conditional renders move or remove pinned elements without
  // firing scroll — watch the DOM so pins re-anchor (or hide) right away. The
  // callback is rAF-coalesced, and it only sets styles (no node changes), so it
  // can't retrigger the observer.
  new MutationObserver(scheduleReposition).observe(document.body, { childList: true, subtree: true });

  if (import.meta.hot) {
    import.meta.hot.on("vite:afterUpdate", () => {
      rebindSelection();
      repositionPins();
    });
  }

  restorePins(); // bring back notes saved on a previous visit to this page/app
  launcher = mountLauncher(controller);

  // If we arrived here from a cross-page "open note", show it once it mounts.
  try {
    const openKey = sessionStorage.getItem(OPEN_KEY);
    if (openKey) {
      sessionStorage.removeItem(OPEN_KEY);
      openNoteWhenReady(openKey);
    }
  } catch {
    /* ignore */
  }
}

// ── Inspect mode ──────────────────────────────────────────────────────
let pointerBound = false;

function bindPointer(on) {
  if (on === pointerBound) return;
  pointerBound = on;
  if (on) {
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
  } else {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    removeHover();
  }
}

// Picking is live only while inspecting AND no panel is open.
function refreshPointer() {
  const on = active && !panel;
  bindPointer(on);
  document.body.style.cursor = on ? "crosshair" : "";
}

function syncActive() {
  const want = sticky || altHeld;
  if (want && !active) enter();
  else if (!want && active) leave();
}

function enter() {
  active = true;
  refreshPointer();
  notify();
}

function leave() {
  active = false;
  refreshPointer();
  notify();
}

// ── Pointer -> nearest data-spotnote element ───────────────────────────────
function targetAt(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.closest("[data-spotnote-ui]")) continue; // skip our own overlay/UI
    const hit = el.closest("[data-spotnote]"); // walk up to nearest annotated node
    if (hit) return hit;
  }
  return null;
}

// A click/hover on our own UI (launcher, panel, pins) must reach that UI — not
// get resolved "through" it to a page element behind, which would swallow the
// event and, e.g., stop the Inspect toggle from turning off.
function overOwnUI(e) {
  return e.target instanceof Element && e.target.closest("[data-spotnote-ui]");
}

function onMove(e) {
  if (overOwnUI(e)) return removeHover();
  const el = targetAt(e.clientX, e.clientY);
  if (!el) return removeHover();
  drawHover(el);
}

function onClick(e) {
  if (panel) return; // a selection is already active
  if (overOwnUI(e)) return; // let our own UI handle its own clicks
  const el = targetAt(e.clientX, e.clientY);
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();

  selectedEl = el;
  const occ = occInfo(el);
  selectedLoc = occ.loc;
  selectedIndex = occ.index;
  drawSelect(el);
  notify();

  console.log("[spotnote] selected:", parseLoc(selectedLoc));
  openPanel(el);
}

// "src/App.jsx:12:4" -> {file, line, column}  (split from the RIGHT: path may contain ':')
function parseLoc(s) {
  const i = s.lastIndexOf(":");
  const j = s.lastIndexOf(":", i - 1);
  return { file: s.slice(0, j), line: Number(s.slice(j + 1, i)), column: Number(s.slice(i + 1)) };
}

// Identity for a picked element: data-spotnote + occurrence index among same-loc
// siblings, so identical .map() items (e.g. <li>) can be told apart.
function occInfo(el) {
  const loc = el.getAttribute("data-spotnote");
  const same = [...document.querySelectorAll(`[data-spotnote="${loc}"]`)];
  const index = same.indexOf(el);
  return { loc, index: index < 0 ? 0 : index, total: same.length };
}
function refKey(loc, index) {
  return `${loc}@${index}`;
}
function resolveRef(loc, index) {
  return document.querySelectorAll(`[data-spotnote="${loc}"]`)[index] || null;
}

// A ready-to-paste prompt: request first, then precise target + context, in a
// labeled/structured layout that's easy for a coding agent to act on.
function buildPrompt(el, note) {
  const l = parseLoc(el.getAttribute("data-spotnote"));
  const occ = occInfo(el);
  const tag = el.tagName.toLowerCase();
  const cls =
    typeof el.className === "string" && el.className.trim() ? ` class="${el.className.trim()}"` : "";
  const id = el.id ? ` id="${el.id}"` : "";
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const cs = getComputedStyle(el);
  const round = (v) => v.replace(/(\d+\.\d{2})\d+/g, "$1"); // trim fractional px
  const styles = [
    ["padding", "padding"],
    ["margin", "margin"],
    ["color", "color"],
    ["background", "background-color"],
    ["font-size", "font-size"],
    ["font-weight", "font-weight"],
    ["border-radius", "border-radius"],
  ]
    .map(([label, prop]) => `  ${label}: ${round(cs.getPropertyValue(prop))}`)
    .join("\n");

  return [
    "Edit the source for the UI element below to apply the request.",
    "",
    `## Request`,
    note,
    "",
    `## Target`,
    `- file: ${l.file}`,
    `- line: ${l.line}, column: ${l.column}`,
    `- element: <${tag}${id}${cls}>`,
    text ? `- text: "${text}"` : null,
    occ.total > 1
      ? `- instance: ${occ.index + 1} of ${occ.total} rendered from this line (by DOM order) — target the one matching the text above`
      : null,
    "",
    `## Current computed styles`,
    styles,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

// ── Keep the selection across HMR ─────────────────────────────────────
function rebindSelection() {
  if (!selectedLoc) return;
  const el = resolveRef(selectedLoc, selectedIndex);
  if (el) {
    selectedEl = el;
    drawSelect(el);
    console.log("[spotnote] selection re-bound after edit:", selectedLoc);
  } else {
    console.warn("[spotnote] selection lost after edit (data-spotnote changed):", selectedLoc);
    removeSelect();
    selectedEl = null;
    selectedLoc = null;
  }
  notify();
}

// ── Overlay UI (design language referenced from the Spotnote plugin) ──
function injectStyles() {
  if (document.getElementById("data-spotnote-style")) return;
  const style = document.createElement("style");
  style.id = "data-spotnote-style";
  style.textContent = "@keyframes dl-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(style);
}

// `absolute` = document coordinates (rides page scroll natively, no lag) for the
// persistent selection box; `fixed` (default) for the transient hover box, which
// is redrawn on mousemove.
function mkBox(dashed, absolute) {
  const box = document.createElement("div");
  box.setAttribute("data-spotnote-ui", "");
  box.style.cssText =
    `position:${absolute ? "absolute" : "fixed"};pointer-events:none;z-index:2147483646;box-sizing:border-box;border-radius:3px;` +
    `border:2px ${dashed ? "dashed" : "solid"} ${ACCENT};background:rgba(${ACCENT_RGB},0.10)`;
  return box;
}

function mkLabel() {
  const l = document.createElement("div");
  l.setAttribute("data-spotnote-ui", "");
  l.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483647;display:flex;gap:6px;align-items:center;" +
    `background:${ACCENT};color:#fff;font-family:${FONT};font-size:12px;font-weight:600;` +
    "padding:2px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25)";
  return l;
}

// tag (strong) + .class (muted) + (file:line) (muted mono).
function setLabel(labelEl, el) {
  labelEl.textContent = "";
  const tag = document.createElement("span");
  tag.textContent = el.tagName.toLowerCase();
  labelEl.appendChild(tag);

  const cls =
    typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean)[0] : "";
  if (cls) {
    const c = document.createElement("span");
    c.style.color = "rgba(255,255,255,0.6)";
    c.textContent = "." + cls;
    labelEl.appendChild(c);
  }

  const loc = document.createElement("span");
  loc.style.cssText = `color:rgba(255,255,255,0.8);font-family:${MONO};font-weight:400`;
  const l = parseLoc(el.getAttribute("data-spotnote"));
  loc.textContent = `(${l.file.split("/").pop()}:${l.line})`;
  labelEl.appendChild(loc);
}

// Viewport coords — for the transient (fixed) hover box.
function place(box, target) {
  const r = target.getBoundingClientRect();
  box.style.left = r.left + "px";
  box.style.top = r.top + "px";
  box.style.width = r.width + "px";
  box.style.height = r.height + "px";
}

// Document coords — for absolute overlays that scroll with the page. During a
// page scroll (rect.top + scrollY) is constant, so the reposition is a no-op and
// the overlay tracks smoothly; it only recomputes for nested scroll / layout.
function placeAbs(box, target) {
  const r = target.getBoundingClientRect();
  box.style.left = r.left + window.scrollX + "px";
  box.style.top = r.top + window.scrollY + "px";
  box.style.width = r.width + "px";
  box.style.height = r.height + "px";
}

function drawHover(target) {
  if (!hoverBox) {
    hoverBox = mkBox(true);
    hoverLabel = mkLabel();
    document.body.append(hoverBox, hoverLabel);
  }
  place(hoverBox, target);
  setLabel(hoverLabel, target);
  const r = target.getBoundingClientRect();
  hoverLabel.style.left = r.left + "px";
  hoverLabel.style.top = Math.max(0, r.top - 24) + "px";
}

function removeHover() {
  hoverBox?.remove();
  hoverLabel?.remove();
  hoverBox = null;
  hoverLabel = null;
}

function drawSelect(target) {
  if (!selectBox) {
    selectBox = mkBox(false, true); // absolute — rides page scroll
    document.body.append(selectBox);
  }
  placeAbs(selectBox, target);
}

function removeSelect() {
  selectBox?.remove();
  selectBox = null;
}

function repositionSelect() {
  if (selectBox && selectedEl && selectedEl.isConnected) placeAbs(selectBox, selectedEl);
}

// ── Selection panel (note input + actions) ────────────────────────────
function ensurePlaceholderStyle() {
  if (document.getElementById("data-spotnote-ph")) return;
  const s = document.createElement("style");
  s.id = "data-spotnote-ph";
  s.textContent =
    "[data-spotnote-input]:empty::before{content:attr(data-placeholder);color:#666;pointer-events:none}";
  document.head.append(s);
}

function panelLabel(el) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:6px;align-items:baseline;min-width:0;flex:1;overflow:hidden";

  const tag = document.createElement("span");
  tag.style.cssText = `color:${T.text};font-weight:600;font-size:13px;flex-shrink:0`;
  tag.textContent = el.tagName.toLowerCase();
  wrap.append(tag);

  const cls =
    typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean)[0] : "";
  if (cls) {
    // The class is the flexible bit — let it ellipsize so a long name can't
    // push the file:line out of the panel.
    const c = document.createElement("span");
    c.style.cssText = `color:${T.textMuted};font-size:12px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
    c.textContent = "." + cls;
    wrap.append(c);
  }

  const l = parseLoc(el.getAttribute("data-spotnote"));
  const loc = document.createElement("span");
  loc.style.cssText = `color:${T.textMuted};font-family:${MONO};font-size:11px;white-space:nowrap;flex-shrink:0`;
  loc.textContent = `(${l.file.split("/").pop()}:${l.line})`;
  wrap.append(loc);
  return wrap;
}

function openPanel(target, prefillNote) {
  closePanel();
  ensurePlaceholderStyle();
  const locStr = target.getAttribute("data-spotnote");
  const occ = occInfo(target);
  const key = refKey(occ.loc, occ.index);
  const isEdit = pins.has(key); // reopened an existing note
  panelTarget = target;
  panelDragged = false;

  panel = document.createElement("div");
  panel.setAttribute("data-spotnote-ui", "");
  panel.style.cssText = [
    "position:fixed", "z-index:2147483647", "width:300px",
    `background:${T.bg}`, `border:1px solid ${T.border}`, "border-radius:10px",
    "box-shadow:0 12px 32px rgba(0,0,0,0.5)", "overflow:hidden",
    `font-family:${FONT}`, "animation:dl-fade .15s ease",
  ].join(";");

  // Header: label + icon buttons
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:center;gap:4px;padding:7px 7px 7px 12px;border-bottom:1px solid ${T.borderSubtle};cursor:move`;
  header.append(panelLabel(target));
  if (isEdit) {
    const copyBtn = createIconBtn({
      svg: ICONS.copy,
      title: "Copy source path",
      parent: header,
      onClick: () => {
        navigator.clipboard?.writeText(locStr);
        copyBtn.innerHTML = ICONS.check; // green tick feedback, then revert
        clearTimeout(copyBtn._t);
        copyBtn._t = setTimeout(() => {
          copyBtn.innerHTML = ICONS.copy;
        }, 1200);
      },
    });
    createIconBtn({
      svg: ICONS.trash,
      title: "Remove note",
      parent: header,
      onClick: () => {
        deletePin(key);
        closePanel();
      },
    });
  }
  createIconBtn({ svg: ICONS.close, title: "Close", parent: header, onClick: closePanel });
  panel.append(header);

  // Note input
  const inputWrap = document.createElement("div");
  inputWrap.style.cssText = "padding:10px 12px";
  const input = document.createElement("div");
  input.contentEditable = "true";
  input.spellcheck = false;
  input.setAttribute("data-spotnote-input", "1");
  input.setAttribute("data-placeholder", "Describe the change for the agent…");
  input.style.cssText = `min-height:20px;max-height:120px;overflow-y:auto;color:${T.text};font-size:13px;line-height:18px;outline:none;white-space:pre-wrap;word-break:break-word`;
  if (prefillNote) input.textContent = prefillNote;
  inputWrap.append(input);
  panel.append(inputWrap);

  function doSend() {
    const note = (input.textContent || "").trim();
    if (!note) return;
    const prompt = buildPrompt(target, note);
    navigator.clipboard?.writeText(prompt).catch(() => {});
    console.log("[spotnote] copied prompt:\n" + prompt);
    upsertPin(occ, note); // leave a marker on the element
    closePanel();
    sticky = false; // exit selection mode
    syncActive();
    launcher?.flash("copied ✓");
  }

  // Footer: Cancel + Add (creation) / Update (edit).
  const footer = document.createElement("div");
  footer.style.cssText = `display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;border-top:1px solid ${T.borderSubtle}`;
  createButton({ label: "Cancel", variant: "secondary", parent: footer, onClick: closePanel });
  const send = createButton({ label: isEdit ? "Update" : "Add", variant: "primary", parent: footer, onClick: doSend });
  panel.append(footer);
  const updateSend = () => {
    const has = (input.textContent || "").trim().length > 0;
    send.disabled = !has;
    send.style.opacity = has ? "1" : "0.4";
    send.style.cursor = has ? "pointer" : "default";
  };
  input.addEventListener("input", updateSend);
  updateSend();

  input.addEventListener("keydown", (e) => {
    // Keep keystrokes in the note input from leaking to the page; Enter adds.
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
    // Esc handled by the capture-phase window listener (closes + consumes).
  });

  document.body.append(panel);
  positionPanel(target);
  enablePanelDrag(panel);
  refreshPointer(); // pause picking while the panel is open
  setTimeout(() => {
    input.focus();
    // With a prefilled note, drop the caret at the END so editing continues
    // naturally (browsers otherwise place it at the start).
    if (prefillNote && input.firstChild) {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, 50);
  setTimeout(() => document.addEventListener("mousedown", onDocDown, true), 0);
}

// Drag the panel from anywhere on it — except the note input (typing / caret /
// text selection) and buttons (their own clicks). Once moved, it stays put
// instead of snapping back to the target on scroll.
function enablePanelDrag(panelEl) {
  panelEl.addEventListener("mousedown", (e) => {
    if (
      !(e.target instanceof Element) ||
      e.target.closest("[data-spotnote-input]") ||
      e.target.closest("button")
    )
      return;
    e.preventDefault(); // no text selection while dragging
    const startX = e.clientX;
    const startY = e.clientY;
    const r = panelEl.getBoundingClientRect();
    const ox = r.left;
    const oy = r.top;
    panelDragged = true;
    const onMove = (ev) => {
      const left = Math.max(8, Math.min(ox + (ev.clientX - startX), window.innerWidth - panelEl.offsetWidth - 8));
      const top = Math.max(8, Math.min(oy + (ev.clientY - startY), window.innerHeight - panelEl.offsetHeight - 8));
      panelEl.style.left = left + "px";
      panelEl.style.top = top + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  });
}

function positionPanel(target) {
  const r = target.getBoundingClientRect();
  const pr = panel.getBoundingClientRect();
  const gap = 8;
  let top = r.bottom + gap;
  if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - gap);
  const left = Math.max(8, Math.min(r.left, window.innerWidth - pr.width - 8));
  panel.style.left = left + "px";
  panel.style.top = top + "px";
}

function onDocDown(e) {
  if (!panel) return;
  if (panel.contains(e.target)) return;
  if (selectedEl && selectedEl.contains(e.target)) return;
  closePanel();
}

function closePanel() {
  if (!panel) return;
  document.removeEventListener("mousedown", onDocDown, true);
  panel.remove();
  panel = null;
  panelTarget = null;
  // A closed panel ends the transient selection (pins persist separately).
  removeSelect();
  selectedEl = null;
  selectedLoc = null;
  selectedIndex = 0;
  notify();
  // Deferred so the click that dismissed the panel can't immediately re-select.
  setTimeout(refreshPointer, 0);
}

// ── Pins: persistent markers left on elements that have a note ────────
function makePinEl() {
  const m = document.createElement("div");
  m.setAttribute("data-spotnote-ui", "");
  m.style.cssText =
    "position:absolute;z-index:2147483645;cursor:pointer;width:22px;height:22px;border-radius:50%;" +
    `background:${ACCENT};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)`;
  m.innerHTML =
    '<svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:block" ' +
    'width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">' +
    '<line x1="6" y1="10" x2="18" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/></svg>';
  return m;
}

// ── Persistence: notes survive reloads and page navigation ───────────
function pageUrl() {
  return location.pathname + location.search;
}
function savePins() {
  try {
    const data = [...pins.entries()].map(([key, p]) => ({ key, loc: p.loc, index: p.index, note: p.note, url: p.url }));
    localStorage.setItem(PINS_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / serialization errors */
  }
}
function restorePins() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(PINS_KEY) || "[]");
  } catch {
    saved = [];
  }
  for (const s of saved) {
    if (!s || pins.has(s.key)) continue;
    const marker = makePinMarker(s.key, s.loc, s.index);
    pins.set(s.key, { loc: s.loc, index: s.index, note: s.note, url: s.url, marker });
  }
  repositionPins();
}

// After a cross-page jump the target element may not be mounted yet (frameworks
// render async) — retry briefly until it appears, then open the note.
function openNoteWhenReady(key, tries = 20) {
  const p = pins.get(key);
  if (!p) return;
  if (resolveRef(p.loc, p.index)) controller.openNote(key);
  else if (tries > 0) setTimeout(() => openNoteWhenReady(key, tries - 1), 100);
}

// Build a pin's DOM marker + its reopen-on-click handler.
function makePinMarker(key, loc, index) {
  const marker = makePinEl();
  marker.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const p = pins.get(key);
    const el = resolveRef(loc, index);
    if (el && p) openPanel(el, p.note);
  });
  document.body.append(marker);
  return marker;
}

function upsertPin(occ, note) {
  const key = refKey(occ.loc, occ.index);
  let pin = pins.get(key);
  if (!pin) {
    const marker = makePinMarker(key, occ.loc, occ.index);
    pin = { loc: occ.loc, index: occ.index, note, url: pageUrl(), marker };
    pins.set(key, pin);
  } else {
    pin.note = note;
  }
  savePins();
  repositionPins();
  notify();
}

function deletePin(key) {
  const pin = pins.get(key);
  if (!pin) return;
  pin.marker.remove();
  pins.delete(key);
  savePins();
}

function repositionPins() {
  for (const [, pin] of pins) {
    const el = resolveRef(pin.loc, pin.index);
    if (pinsVisible && el && el.isConnected) {
      const r = el.getBoundingClientRect();
      pin.marker.style.display = "";
      pin.marker.style.left = r.left + window.scrollX - 11 + "px";
      pin.marker.style.top = r.top + window.scrollY - 11 + "px";
    } else {
      pin.marker.style.display = "none";
    }
  }
}

function reposition() {
  repositionSelect();
  repositionPins();
  if (panel && panelTarget && panelTarget.isConnected && !panelDragged) positionPanel(panelTarget);
}

// Scroll fires rapidly; coalesce repositions into one per animation frame.
let repoScheduled = false;
function scheduleReposition() {
  if (repoScheduled) return;
  repoScheduled = true;
  requestAnimationFrame(() => {
    repoScheduled = false;
    reposition();
  });
}
