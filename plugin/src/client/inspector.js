// Framework-agnostic client picker for `data-spotnote`.
// - Inspect via the launcher toggle OR by holding Alt; hover highlights the
//   nearest data-spotnote element, click opens a selection panel.
// - Write a note; Enter saves it, drops a pin and copies a ready-to-paste prompt
//   (see prompt.js) — or, with spotnote-mcp connected, leaves it to the agent.
// - After each HMR update the selection/pins re-bind by exact data-spotnote.
import { createIconBtn, uiRoot, applyLook } from "./ui.js";
import { T } from "./styles.js";
import { ICONS, STATE_ICONS, FRAMEWORKS, fwIcon } from "./icons.js";
import { mountLauncher } from "./launcher.js";
import { getSettings, onSettings } from "./settings.js";
import { connectRemote } from "./remote.js";
import { renderMarkdown } from "./markdown.js";
import { createLayer, closeTopLayer } from "./layers.js";
import { confirmOver } from "./confirm.js";
import { parseLoc, occInfo, refKey, resolveRef, buildPrompt, savedPrompt } from "./prompt.js";
import { agentName, agentLabel, thinkingMsg } from "./conversation.js";
import { openFile, hideTip } from "./open-file.js";
import { enablePanelDrag, applyPanelSize, enablePanelResize, nudgePanel } from "./panel-frame.js";

const ACTIVATE_KEY = "Alt";
const ACCENT = T.accent;
const ACCENT_RGB = T.accentRgb;
const MONO = T.mono;

let active = false; // effective inspect state
let sticky = false; // toggled from the launcher
let altHeld = false; // momentary via Alt
let hoverBox = null;
let hoverLabel = null;
let hoverTarget = null; // element the hover box is currently on
let lastPointer = null; // { x, y, own } from the latest mousemove
let moveScheduled = false;
let selectBox = null;
let selectedEl = null;
let selectedLoc = null;
let selectedIndex = 0; // occurrence index among same-loc siblings (.map() items)
let selectedRawTarget = null; // the actual clicked node (may be unstamped, e.g. 3rd-party)
let panel = null;
let panelTarget = null; // element the open panel is anchored to
let panelDragged = false; // once dragged, stop re-anchoring it to the target
let panelSave = null; // saves an edited note when its panel closes
let panelDraft = null; // () => true while the note has unsent text
let panelKey = null; // the open panel's note key
let panelRefresh = null; // redraws the open panel's conversation
let panelMode = null; // what the open panel was built for (see noteMode)
let panelSync = null; // updates the open panel when the agent (dis)connects
const panelLayer = createLayer({ close: () => closePanel() }); // stacking + Esc (layers.js)
let remote = null; // the link to spotnote-mcp (remote.js)
let launcher = null;
let jsxFramework = null; // "react" | "solid" | null, detected by the plugin
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
  // The launcher drives this: open ⇄ selecting, closed ⇄ not.
  setInspect(on) {
    sticky = on;
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
  // `lost`: the note was written on this page, but no element has its source
  // location any more (an edit moved or removed it).
  fileKind,
  mcpStatus: () => remote?.status() ?? "off",
  about: null, // { version, repo }, from the plugin (initInspector)
  notes: () =>
    [...pins.entries()].map(([key, p]) => ({
      key,
      loc: p.loc,
      index: p.index,
      note: p.note,
      state: pinState(p),
      mark: STATE_ICONS[pinState(p)], // SVG markup, or none for a plain number
      client: p.working?.client, // the agent working on it
      url: p.url,
      here: !p.url || p.url === pageUrl(), // written on the page you're on
      lost: (!p.url || p.url === pageUrl()) && !resolveRef(p.loc, p.index),
    })),
  copyNote(key) {
    const p = pins.get(key);
    if (p) navigator.clipboard?.writeText(savedPrompt(p)).catch(() => {});
  },
  deleteNote(key) {
    deletePin(key);
    notify();
  },
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

export function initInspector({ jsx = null, root = "", port = 4848, about = null } = {}) {
  if (window.__spotnote) return; // already booted — guard against a double inject
  window.__spotnote = true;
  jsxFramework = jsx;
  controller.about = about;
  applyLook(getSettings());
  onSettings(applyLook);

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
  // Esc backs out one step at a time: the frontmost surface (the note panel or a
  // launcher menu, see layers.js), then selection mode. It's consumed (capture)
  // so it can't cascade — but only when it did something, so a bare Esc still
  // reaches the page.
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      const closed = closeTopLayer(); // a closed panel keeps selecting
      if (!closed && !active) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (closed) return;
      sticky = false;
      syncActive();
    },
    true,
  );
  window.addEventListener("scroll", scheduleReposition, true);
  window.addEventListener("resize", scheduleReposition);
  // Route changes / conditional renders move or remove pinned elements without
  // firing scroll, and a hot update that shifts a line only rewrites the
  // data-spotnote attribute — watch both so pins re-anchor (or hide) right away
  // and the notes list re-checks which notes lost their element. The callbacks
  // are rAF-coalesced and only set styles (no node changes), so they can't
  // retrigger the observer.
  new MutationObserver(() => {
    scheduleReposition();
    scheduleNotify();
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-spotnote"] });

  if (import.meta.hot) {
    import.meta.hot.on("vite:afterUpdate", () => {
      rebindSelection();
      repositionPins();
    });
  }

  restorePins(); // bring back notes saved on a previous visit to this page/app
  // With spotnote-mcp running, its notes are the truth. On connecting, hand it
  // the notes kept here meanwhile (the newer copy of each wins).
  remote = connectRemote({
    root,
    port,
    onSnapshot: applySnapshot,
    onStatus() {
      notify(); // the launcher's Settings shows it
      panelSync?.(); // copy or not, in the open panel
    },
    onOnline(on) {
      if (on) return remote.send({ op: "merge", notes: [...pins].map(([key, p]) => wire(key, p)) });
      // The server (and with it the agent) went away: nobody is working on anything.
      pins.forEach((pin) => (pin.working = false) || showState(pin));
      repositionPins();
      notify();
    },
  });
  launcher = mountLauncher(controller);

  // If we arrived here from a cross-page "open note", show it once it mounts.
  try {
    const openKey = sessionStorage.getItem(OPEN_KEY);
    if (openKey) {
      sessionStorage.removeItem(OPEN_KEY);
      launcher.open(); // it starts closed; the jump came from its notes list
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
    lastPointer = null;
    hideHover();
  }
}

// Page clicks are ours while inspecting, and also while a panel is open (even
// paused or after Alt is released) — so a click can never slip through to the
// page, navigate away, and strand the panel on a vanished element.
function refreshPointer() {
  bindPointer(active || !!panel);
  document.body.style.cursor = active ? "crosshair" : "";
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

// mousemove can fire several times per frame; resolve the target once per frame.
function onMove(e) {
  lastPointer = { x: e.clientX, y: e.clientY, own: overOwnUI(e) };
  if (moveScheduled) return;
  moveScheduled = true;
  requestAnimationFrame(() => {
    moveScheduled = false;
    updateHover(true);
  });
}

// Re-resolve the element under the last pointer position. `animate` slides the
// box from its previous target; scroll passes false so it tracks without lag.
function updateHover(animate) {
  if (!active || !lastPointer || lastPointer.own) return hideHover();
  const el = targetAt(lastPointer.x, lastPointer.y);
  if (!el) return hideHover();
  drawHover(el, animate);
}

function onClick(e) {
  if (overOwnUI(e)) return; // let our own UI handle its own clicks
  const el = active ? targetAt(e.clientX, e.clientY) : null;
  if (panel) {
    e.preventDefault();
    e.stopPropagation();
    if (el === panelTarget) return;
    // Unsent text survives the first click away: nudge instead.
    if (panelDraft?.()) return nudgePanel(panel);
    if (!el) return closePanel();
  }
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();

  selectedRawTarget = e.target instanceof Element ? e.target : null; // may be deeper than `el`
  console.log("[spotnote] selected:", el.getAttribute("data-spotnote"));
  openPanel(el); // sets the selection + highlight for every open path
}

// The framework mark for a source file: .vue/.svelte by extension; .jsx/.tsx by
// what the plugin found in the Vite config ("jsx" when it couldn't tell).
function fileKind(file) {
  if (file.endsWith(".vue")) return "vue";
  if (file.endsWith(".svelte")) return "svelte";
  return jsxFramework || "jsx";
}

// [mark] File.jsx:12 — the file part of the hover label and the panel header.
function fileTag(file, line, color) {
  const kind = fileKind(file);
  const wrap = document.createElement("span");
  // margin-left: a little extra air after the tag/class, so the file reads as its own group.
  wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin-left:4px;white-space:nowrap;flex-shrink:0";
  wrap.title = FRAMEWORKS[kind].name;
  const icon = document.createElement("span");
  icon.style.cssText = `display:inline-flex;color:${color ?? FRAMEWORKS[kind].color}`;
  icon.innerHTML = fwIcon(kind); // hardcoded SVG constants, not user input
  const name = document.createElement("span");
  name.textContent = `${file.split("/").pop()}:${line}`;
  wrap.append(icon, name);
  return wrap;
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
// The selection box: document coordinates (absolute), so it rides page scroll
// natively with no lag.
function mkBox() {
  const box = document.createElement("div");
  box.setAttribute("data-spotnote-ui", "");
  // z-index: under pins (see the stacking note in ui.js).
  box.style.cssText =
    "position:absolute;pointer-events:none;z-index:2147483640;box-sizing:border-box;border-radius:3px;" +
    `border:2px solid ${ACCENT};background:rgba(${ACCENT_RGB},0.10)`;
  return box;
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
    c.style.opacity = "0.6"; // the label's ink, faded
    c.textContent = "." + cls;
    labelEl.appendChild(c);
  }

  // On the accent label the mark stays in the label's ink, not brand colour.
  const l = parseLoc(el.getAttribute("data-spotnote"));
  const loc = fileTag(l.file, l.line, "inherit");
  loc.style.opacity = "0.75";
  loc.style.fontFamily = MONO;
  loc.style.fontWeight = "400";
  labelEl.appendChild(loc);
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

// The hover box + label are created once and slid between targets with
// transform + size transitions, so moving across elements animates instead of
// flickering. A hidden box snaps into place first, then fades in, so it never
// slides in from wherever it was last shown.
function drawHover(target, animate) {
  if (!hoverBox) {
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

function hideHover() {
  hoverBox?.classList.remove("sn-on");
  hoverLabel?.classList.remove("sn-on");
  hoverTarget = null;
}

function drawSelect(target) {
  if (!selectBox) {
    selectBox = mkBox();
    uiRoot().append(selectBox);
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

  // The element's file:line, as a button that opens it in your editor.
  const l = parseLoc(el.getAttribute("data-spotnote"));
  const loc = document.createElement("button");
  loc.type = "button";
  loc.className = "sn-loc";
  loc.title = `Open ${l.file}:${l.line} in your editor`;
  loc.append(fileTag(l.file, l.line));
  loc.addEventListener("click", () => openFile({ path: l.file, line: String(l.line), column: String(l.column) }, loc));
  wrap.append(loc);
  return wrap;
}

// What a note's panel is for:
//   "edit"     write or change the note (also a new one, with no pin yet)
//   "working"  an agent has it: show the conversation, no input until it answers
//   "talking"  the agent has answered: show the conversation, the input replies
function noteMode(pin) {
  if (!pin) return "edit";
  if (pin.working) return "working";
  return pin.thread?.length > 0 || pin.done || pin.dismissed ? "talking" : "edit";
}

// Is the coding agent connected (spotnote-mcp has our notes)?
const agentConnected = () => remote?.status() === "on";

// The open note changed (from the server): redraw its conversation, or rebuild
// the panel in place when it moved between edit, working and talking.
function refreshPanel() {
  if (!panelKey || panelMode === "new") return; // a note still being written isn't on the server yet
  const pin = pins.get(panelKey);
  if (!pin) return closePanel(); // deleted, here or in another browser
  if (noteMode(pin) === panelMode) return panelRefresh?.();
  const moved = panelDragged && { left: panel.style.left, top: panel.style.top };
  openPanel(panelTarget, undefined, { instant: true });
  if (moved) {
    Object.assign(panel.style, moved);
    panelDragged = true;
  }
}

function openPanel(target, prefillNote, { instant = false } = {}) {
  closePanel({ instant });
  const occ = occInfo(target);
  const key = refKey(occ.loc, occ.index);
  const isEdit = pins.has(key); // reopened an existing note
  const mode = noteMode(pins.get(key));
  panelMode = isEdit ? mode : "new";
  // Once an agent has the note, the panel is a conversation: the input replies
  // instead of editing the note (and waits while the agent works).
  const talking = mode !== "edit";
  // Clicking an element that already has a note edits it, so start from that
  // note — otherwise the save-on-close would overwrite it with fresh text.
  prefillNote = talking ? null : (prefillNote ?? pins.get(key)?.note);
  panelTarget = target;
  panelKey = key;
  panelDragged = false;

  // Highlight the target whenever the panel is open — including reopens from a
  // pin or the notes list, not just a fresh click.
  selectedEl = target;
  selectedLoc = occ.loc;
  selectedIndex = occ.index;
  drawSelect(target);

  panel = document.createElement("div");
  panel.setAttribute("data-spotnote-ui", "");
  panel.className = "sn-panel";
  if (instant) panel.style.animation = "none"; // a rebuild in place, not a new panel

  // Header: label + icon buttons
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:center;gap:4px;padding:7px 7px 7px 12px;border-bottom:1px solid ${T.borderSubtle};cursor:move`;
  header.append(panelLabel(target));
  let copyBtn = null;
  if (isEdit) {
    copyBtn = createIconBtn({
      svg: ICONS.copy,
      title: "Copy prompt",
      parent: header,
      onClick: () => {
        const note = talking ? pins.get(key).note : (input.textContent || "").trim();
        if (!note) return;
        navigator.clipboard?.writeText(buildPrompt(target, note, selectedRawTarget)).catch(() => {});
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
      onClick: () => askDelete(),
    });
  }
  createIconBtn({ svg: ICONS.close, title: "Close", parent: header, onClick: closePanel });
  panel.append(header);

  // The conversation: your note, then the agent's and your messages.
  if (talking) {
    const thread = document.createElement("div");
    thread.className = "sn-thread";
    panel.append(thread);
    panelRefresh = () => {
      const pin = pins.get(key);
      if (!pin) return;
      thread.textContent = "";
      hideTip(); // its icon may be gone
      for (const m of [{ from: "you", text: pin.note }, ...(pin.thread ?? [])]) {
        const msg = document.createElement("div");
        msg.className = m.from === "agent" ? "sn-msg sn-msg-agent" : "sn-msg";
        const who = m.from === "agent" ? agentLabel(m.client) : Object.assign(document.createElement("span"), { className: "sn-who", textContent: "You" });
        if (m.dismisses) who.append(" · won't do");
        if (m.pending) who.append(" · not sent yet"); // written while the agent was away
        msg.append(who);
        // The agent writes Markdown; what you typed stays as typed.
        if (m.from === "agent") {
          const body = document.createElement("div");
          body.className = "sn-msg-body sn-md";
          body.append(renderMarkdown(m.text, openFile));
          msg.append(body);
        } else msg.append(Object.assign(document.createElement("div"), { className: "sn-msg-body", textContent: m.text }));
        thread.append(msg);
      }
      // While an agent works on it: a message from the agent, still being written.
      if (pin.working) thread.append(thinkingMsg(pin.working.client));
      // The agent went away: what you write waits here until it's back.
      else if (!agentConnected()) {
        const off = document.createElement("div");
        off.className = "sn-offline";
        off.textContent = `${agentName(pin)} is offline`;
        thread.append(off);
      }
      thread.scrollTop = thread.scrollHeight;
    };
    panelRefresh();
  }

  // Note input
  const inputWrap = document.createElement("div");
  inputWrap.className = "sn-compose";
  if (talking) inputWrap.style.borderTop = `1px solid ${T.borderSubtle}`; // reply box, below the conversation
  const input = document.createElement("div");
  input.contentEditable = "true";
  input.spellcheck = false;
  input.setAttribute("data-spotnote-input", "1");
  input.setAttribute("data-placeholder", talking ? "Reply to the agent…" : "Describe the change for the agent…");
  input.style.cssText = `min-height:20px;max-height:120px;overflow-y:auto;color:${T.text};font-size:13px;line-height:18px;outline:none;white-space:pre-wrap;word-break:break-word`;
  if (prefillNote) input.textContent = prefillNote;
  inputWrap.append(input);
  panel.append(inputWrap);
  if (mode === "working") {
    // Nothing to type while the agent works (the conversation shows it thinking);
    // its answer rebuilds the panel.
    inputWrap.remove();
    // Keep the focus here and swallow typing, so a half-typed word can't reach
    // the page (Esc still closes: it's handled on window, in the capture phase).
    panel.tabIndex = -1;
    panel.style.outline = "none";
    panel.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (!e.target.closest?.("button")) e.preventDefault(); // Enter still presses Delete
    });
  }

  // Delete asks first, over the dimmed panel.
  const askDelete = () =>
    !panel.querySelector(".sn-confirm") &&
    confirmOver(panel, {
      title: "Delete this note?",
      body: talking ? "Its conversation with the agent goes too. This can't be undone." : "This can't be undone.",
      action: "Delete",
      onConfirm: () => {
        deletePin(key);
        closePanel();
      },
      onCancel: () => (mode === "working" ? panel.focus() : input.focus()),
    });

  function doSend() {
    const note = (input.textContent || "").trim();
    if (!note) return;
    if (talking) {
      // A reply goes to the agent over MCP, so there's nothing to copy.
      replyNote(key, note);
      input.textContent = "";
      updateSend();
      panelRefresh();
      return;
    }
    const prompt = buildPrompt(target, note, selectedRawTarget);
    // With the agent connected, it gets the note directly: leave the clipboard be.
    if (!agentConnected()) {
      navigator.clipboard?.writeText(prompt).catch(() => {});
      console.log("[spotnote] copied prompt:\n" + prompt);
    }
    upsertPin(occ, note); // leave a marker on the element
    closePanel(); // selection mode stays on while the launcher is open
    launcher?.flash(); // ✓ on the launcher core
  }

  // No Cancel/Save footer: ×, Esc and an outside click all close. Enter (or
  // this hint) sends; an edited note also saves itself on close. A new note is
  // only kept once sent, so half-typed text never becomes a pin.
  const send = document.createElement("button");
  send.className = "sn-send";
  // Copying is for handing the prompt over by hand: not needed (and not shown)
  // while the agent is connected over MCP.
  panelSync = () => {
    const copy = !agentConnected();
    if (talking) {
      input.dataset.placeholder = copy ? `Sent once ${agentName(pins.get(key))} is back…` : "Reply to the agent…";
      panelRefresh();
    }
    send.innerHTML = `<kbd>↵</kbd>${talking ? "Reply" : isEdit ? "Save" : "Add"}${copy && !talking ? " &amp; copy" : ""}`;
    if (copyBtn) copyBtn.style.display = copy ? "flex" : "none"; // its inline display beats [hidden]
  };
  panelSync();
  send.addEventListener("click", doSend);
  if (mode !== "working") inputWrap.append(send);
  const updateSend = () => (send.disabled = !(input.textContent || "").trim());
  input.addEventListener("input", updateSend);
  updateSend();
  // Unsent text — a new note, or an edit that differs from the saved note.
  panelDraft = () => {
    const note = (input.textContent || "").trim();
    return mode !== "working" && !!note && (talking || note !== pins.get(key)?.note);
  };
  if (isEdit && !talking) {
    panelSave = () => {
      const note = (input.textContent || "").trim();
      // Skip a note just deleted from this panel, and an emptied one.
      if (note && pins.has(key) && note !== pins.get(key).note) upsertPin(occ, note);
    };
  }

  input.addEventListener("keydown", (e) => {
    // Keep keystrokes in the note input from leaking to the page; Enter adds.
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
    // Esc handled by the capture-phase window listener (closes + consumes).
  });

  uiRoot().append(panel);
  // On top — or, rebuilt in place, where it was in the stack.
  if (instant) panelLayer.swap(panel);
  else panelLayer.show(panel);
  // Start the conversation at its latest message (it had no height before now).
  const threadEl = panel.querySelector(".sn-thread");
  if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
  applyPanelSize(panel);
  positionPanel(target);
  enablePanelDrag(panel, () => (panelDragged = true));
  enablePanelResize(panel, () => (panelDragged = true));
  refreshPointer();
  setTimeout(() => {
    if (mode === "working") return panel?.focus();
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

function positionPanel(target) {
  const r = target.getBoundingClientRect();
  // offset* = untransformed size (getBoundingClientRect shrinks mid pop-in).
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  const gap = 8;
  let top = r.bottom + gap;
  const above = top + ph > window.innerHeight - 8;
  if (above) top = Math.max(8, r.top - ph - gap);
  const left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
  panel.style.left = left + "px";
  panel.style.top = top + "px";
  // Grow out of the target: origin under its center, on the edge facing it.
  const ox = Math.max(0, Math.min(r.left + r.width / 2 - left, pw));
  panel.style.transformOrigin = `${ox}px ${above ? "100%" : "0"}`;
}

// While a panel is open, a press on the page is held back too: no focus theft
// from the note, no text selection, no app mousedown handlers. onClick then
// decides what the click does (switch target, close, or nudge).
function onDocDown(e) {
  if (!panel || overOwnUI(e)) return;
  e.preventDefault();
  e.stopPropagation();
}

function closePanel({ instant = false } = {}) {
  if (!panel) return;
  panelSave?.();
  panelSave = null;
  panelDraft = null;
  panelKey = null;
  panelRefresh = null;
  panelMode = null;
  panelSync = null;
  hideTip();
  document.removeEventListener("mousedown", onDocDown, true);
  // Play the exit animation on a detached reference; all state below resets now,
  // so nothing else ever sees a closing panel as open. inert drops its focus so
  // keystrokes can't land in it while it fades.
  if (!instant) panelLayer.hide(); // a rebuild keeps its place (openPanel swaps it)
  const leaving = panel;
  leaving.inert = true;
  if (instant) leaving.remove(); // replaced in place (see refreshPanel)
  leaving.classList.add("sn-leaving");
  const done = () => leaving.remove();
  leaving.addEventListener("animationend", done, { once: true });
  setTimeout(done, 200); // reduced motion: no animation, so no animationend
  panel = null;
  panelTarget = null;
  // A closed panel ends the transient selection (pins persist separately).
  removeSelect();
  selectedEl = null;
  selectedLoc = null;
  selectedIndex = 0;
  selectedRawTarget = null;
  notify();
  // Deferred so the click that dismissed the panel can't immediately re-select.
  setTimeout(refreshPointer, 0);
}

// ── Pins: persistent markers left on elements that have a note ────────
// A pin holds its number (or a state icon), filled in by repositionPins, since
// deleting a pin renumbers the rest.
function makePinEl() {
  const m = document.createElement("div");
  m.setAttribute("data-spotnote-ui", "");
  m.className = "sn-pin";
  m.append(document.createElement("span"));
  return m;
}

// ── Persistence: notes survive reloads and page navigation ───────────
function pageUrl() {
  return location.pathname + location.search;
}
function savePins() {
  try {
    const data = [...pins.entries()].map(([key, p]) => ({
      key,
      loc: p.loc,
      index: p.index,
      note: p.note,
      url: p.url,
      prompt: p.prompt,
      done: p.done,
      dismissed: p.dismissed,
      thread: p.thread,
      updated: p.updated,
    }));
    localStorage.setItem(PINS_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / serialization errors */
  }
}

// A note as spotnote-mcp gets it.
function wire(key, p) {
  return {
    key,
    loc: p.loc,
    index: p.index,
    url: p.url,
    note: p.note,
    prompt: p.prompt ? p.prompt : savedPrompt(p),
    thread: (p.thread ?? []).map(({ pending, ...m }) => m), // on its way now
    done: !!p.done,
    dismissed: !!p.dismissed,
    updated: p.updated ?? 0,
  };
}

// The server's notes replace ours: same order, same pins where the key matches.
function applySnapshot(list) {
  const next = new Map();
  for (const n of list) {
    const pin = pins.get(n.key) ?? { marker: makePinMarker(n.key, n.loc, n.index) };
    Object.assign(pin, { loc: n.loc, index: n.index, note: n.note, url: n.url, prompt: n.prompt, thread: n.thread, done: n.done, dismissed: n.dismissed, working: n.working, updated: n.updated });
    showState(pin);
    next.set(n.key, pin);
  }
  for (const [key, pin] of pins) if (!next.has(key)) pin.marker.remove();
  pins.clear();
  next.forEach((pin, key) => pins.set(key, pin));
  savePins(); // the offline copy
  repositionPins();
  notify();
  refreshPanel();
}

// ── The conversation on a note (see spotnote-mcp) ──────────────────────────
// pin.thread: [{ id, from: "agent" | "you", text, at, resolves?, dismisses? }].
// The note itself is the opening message; resolves marks the agent's "done"
// summary, dismisses its reason for not making the change.
// "done", "dismissed" (the agent won't), "asked" (it's waiting on you),
// "working" (an agent has it) or "open".
function pinState(pin) {
  if (pin.done) return "done";
  if (pin.dismissed) return "dismissed";
  if (pin.thread?.at(-1)?.from === "agent") return "asked";
  return pin.working ? "working" : "open";
}

// Your answer to the agent. Replying on a done note reopens it.
function replyNote(key, text) {
  const pin = pins.get(key);
  const msg = { id: Math.random().toString(36).slice(2), from: "you", text, at: Date.now() };
  if (!agentConnected()) msg.pending = true; // sent with the rest of this note on reconnecting (merge)
  (pin.thread ??= []).push(msg);
  Object.assign(pin, { done: false, dismissed: false, working: false, updated: Date.now() });
  showState(pin);
  savePins();
  remote?.send({ op: "reply", key, text });
  repositionPins();
  notify();
}

function showState(pin) {
  const state = pinState(pin);
  for (const s of ["done", "dismissed", "asked", "working"]) pin.marker.classList.toggle(`sn-${s}`, state === s);
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
    const pin = { loc: s.loc, index: s.index, note: s.note, url: s.url, prompt: s.prompt, done: s.done, dismissed: s.dismissed, thread: s.thread, updated: s.updated, marker };
    pins.set(s.key, pin);
    showState(pin);
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
    // A pin toggles its note: closes it when it's the one open (like ×),
    // otherwise opens it (moving the panel over from another note).
    if (panelKey === key) return closePanel();
    const p = pins.get(key);
    const el = resolveRef(loc, index);
    if (el && p) openPanel(el, p.note);
  });
  uiRoot().append(marker);
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
    if (note !== pin.note) {
      // A rewritten note is a new request: start its conversation over.
      Object.assign(pin, { done: false, dismissed: false, working: false, thread: [] });
    }
    pin.note = note;
    showState(pin);
  }
  // Keep the last full prompt, so the note can still be copied after an edit
  // moves its element away (see savedPrompt).
  const el = resolveRef(occ.loc, occ.index);
  if (el) pin.prompt = buildPrompt(el, note, selectedRawTarget);
  pin.updated = Date.now();
  savePins();
  remote?.send({ op: "upsert", note: wire(key, pin) });
  repositionPins();
  notify();
}

function deletePin(key) {
  const pin = pins.get(key);
  if (!pin) return;
  // Shrink away, then drop the node (timeout covers reduced motion / hidden pins).
  const m = pin.marker;
  m.classList.add("sn-leaving");
  m.addEventListener("animationend", () => m.remove(), { once: true });
  setTimeout(() => m.remove(), 200);
  pins.delete(key);
  savePins();
  remote?.send({ op: "remove", key });
  repositionPins(); // renumber the rest
}

function repositionPins() {
  let n = 0;
  for (const [, pin] of pins) {
    n++; // same order as the launcher's notes list
    // Its number, or an icon for where it stands. data-mark skips redundant redraws.
    const state = pinState(pin);
    const label = STATE_ICONS[state] ? state : String(n);
    const span = pin.marker.firstChild;
    if (span.dataset.mark !== label) {
      span.dataset.mark = label;
      if (STATE_ICONS[state]) span.innerHTML = STATE_ICONS[state]; // hardcoded SVG constants
      else span.textContent = label;
    }
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
  // The page moved under a still pointer: re-resolve what's under it now.
  if (pointerBound) updateHover(false);
  repositionSelect();
  repositionPins();
  // The panel's element was re-rendered (HMR) or removed (a route change):
  // follow its replacement, or close if it's gone.
  if (panel && !panelTarget.isConnected) {
    const el = resolveRef(selectedLoc, selectedIndex);
    if (!el) return closePanel();
    panelTarget = selectedEl = el;
    repositionSelect();
  }
  if (panel && !panelDragged) positionPanel(panelTarget);
}

let notifyScheduled = false;
function scheduleNotify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  requestAnimationFrame(() => {
    notifyScheduled = false;
    notify();
  });
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
