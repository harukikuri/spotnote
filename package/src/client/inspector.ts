// Framework-agnostic client picker for `data-spotnote`.
// - Inspect via the launcher toggle OR by holding Alt; hover highlights the
//   nearest data-spotnote element, click opens a note panel (panel.ts).
// - Write a note; Enter saves it, drops a pin (pins.ts) and copies a
//   ready-to-paste prompt (prompt.ts) — or, with spotnote-mcp connected, leaves
//   it to the agent.
// - After each HMR update the selection/pins re-bind by exact data-spotnote.
// This file boots it all, and runs selection mode and the pointer; state.ts
// lists the other parts.
import { applyLook } from "./ui.ts";
import { STATE_ICONS } from "./icons.ts";
import { mountLauncher } from "./launcher.ts";
import { getSettings, onSettings } from "./settings.ts";
import { connectRemote } from "./remote.ts";
import { closeTopLayer } from "./layers.ts";
import { resolveRef, savedPrompt, setCommit } from "./prompt.ts";
import { setWebhook } from "./webhook.ts";
import { nudgePanel } from "./panel-frame.ts";
import {
  drawHover,
  drawSelect,
  fileKind,
  firstClass,
  hideHover,
  overOwnUI,
  removeSelect,
  repositionSelect,
} from "./overlay.ts";
import {
  closePanel,
  followTarget,
  isPanelOpen,
  openPanel,
  panelEl,
  panelHasDraft,
  panelTarget,
  repositionMoreBoxes,
  syncPanel,
  toggleMore,
} from "./panel.ts";
import { agentGone, applySnapshot, deletePin, pinState, repositionPins, restorePins, wire } from "./pins.ts";
import { app, notify, onChange, pageUrl, pins, selection, targetsOf } from "./state.ts";
import type { Controller } from "./types.ts";

const ACTIVATE_KEY = "Alt";
const OPEN_KEY = "data-spotnote-open"; // note to auto-open after a cross-page jump

let active = false; // effective inspect state
let sticky = false; // toggled from the launcher
let altHeld = false; // momentary via Alt
let lastPointer: { x: number; y: number; own: boolean } | null = null; // from the latest mousemove
let moveScheduled = false;

const controller: Controller = {
  toggleInspect() {
    sticky = !sticky;
    syncActive();
    notify();
  },
  // The launcher drives this: open ⇄ selecting, closed ⇄ not.
  setInspect(on: boolean) {
    sticky = on;
    syncActive();
    notify();
  },
  isInspecting: () => active,
  // Launcher minimized → hide the pins (and their panel) with it.
  setPinsVisible(visible: boolean) {
    app.pinsVisible = visible;
    if (!visible && isPanelOpen()) closePanel();
    repositionPins();
  },
  // `lost`: the note was written on this page, but no element has its source
  // location any more (an edit moved or removed it).
  fileKind,
  mcpStatus: () => app.remote?.status() ?? "off",
  about: null, // { version, repo }, from the plugin (initInspector)
  notes: () =>
    [...pins.entries()].map(([key, p]) => ({
      key,
      loc: p.loc,
      index: p.index,
      note: p.note,
      latest: p.thread?.at(-1)?.text ?? p.note, // the conversation's last message
      // Its elements, as the list's chips: tag and class only when on this page.
      targets: targetsOf(p).map((t) => {
        const el = !p.url || p.url === pageUrl() ? resolveRef(t.loc, t.index) : null;
        return { loc: t.loc, tag: el?.tagName.toLowerCase(), cls: el && firstClass(el) };
      }),
      state: pinState(p),
      mark: STATE_ICONS[pinState(p)], // SVG markup, or none for a plain number
      client: p.working ? p.working.client : undefined, // the agent working on it
      url: p.url,
      here: !p.url || p.url === pageUrl(), // written on the page you're on
      lost: (!p.url || p.url === pageUrl()) && !resolveRef(p.loc, p.index),
    })),
  copyNote(key: string) {
    const p = pins.get(key);
    if (p) navigator.clipboard?.writeText(savedPrompt(p)).catch(() => {});
  },
  deleteNote(key: string) {
    deletePin(key);
    notify();
  },
  openNote: (key: string) => {
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
  onChange,
};

// What the plugin boots the picker with (see load() in ../index.ts).
export interface InspectorOptions {
  jsx?: "react" | "solid" | null;
  root?: string;
  port?: number;
  about?: Controller["about"];
  commit?: string | null;
  webhook?: string | null;
  screenshot?: boolean;
}

export function initInspector({
  jsx = null,
  root = "",
  port = 4848,
  about = null,
  commit = null,
  webhook = null,
  screenshot = false,
}: InspectorOptions = {}): void {
  if (window.__spotnote) return; // already booted — guard against a double inject
  window.__spotnote = true;
  app.jsx = jsx;
  setCommit(commit);
  app.builtFrom = commit;
  setWebhook(webhook, { screenshot });
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
  // launcher menu, see layers.ts), then selection mode. It's consumed (capture)
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
  app.remote = connectRemote({
    root,
    port,
    onSnapshot: applySnapshot,
    onStatus() {
      notify(); // the launcher's Settings shows it
      syncPanel(); // copy or not, in the open panel
    },
    onOnline(on) {
      if (on) return void app.remote?.send({ op: "merge", notes: [...pins].map(([key, p]) => wire(key, p)) });
      agentGone();
    },
  });
  app.launcher = mountLauncher(controller);

  // If we arrived here from a cross-page "open note", show it once it mounts.
  try {
    const openKey = sessionStorage.getItem(OPEN_KEY);
    if (openKey) {
      sessionStorage.removeItem(OPEN_KEY);
      app.launcher.open(); // it starts closed; the jump came from its notes list
      openNoteWhenReady(openKey);
    }
  } catch {
    /* ignore */
  }
}

// After a cross-page jump the target element may not be mounted yet (frameworks
// render async) — retry briefly until it appears, then open the note.
function openNoteWhenReady(key: string, tries = 20) {
  const p = pins.get(key);
  if (!p) return;
  if (resolveRef(p.loc, p.index)) controller.openNote(key);
  else if (tries > 0) setTimeout(() => openNoteWhenReady(key, tries - 1), 100);
}

// ── Inspect mode ──────────────────────────────────────────────────────
let pointerBound = false;

function bindPointer(on: boolean) {
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
export function refreshPointer(): void {
  bindPointer(active || isPanelOpen());
  setCrosshair(active);
}

// The crosshair comes from a stylesheet of ours, not the body's style attribute:
// changing the page's markup before a server-rendered app hydrates is a
// mismatch (React warns about it, after a jump from another page's note).
let crosshair: CSSStyleSheet | undefined;
function setCrosshair(on: boolean) {
  if (!crosshair) {
    crosshair = new CSSStyleSheet();
    crosshair.replaceSync("body { cursor: crosshair !important; }");
  }
  const sheet = crosshair;
  const sheets = document.adoptedStyleSheets;
  if (on === sheets.includes(sheet)) return;
  document.adoptedStyleSheets = on ? [...sheets, sheet] : sheets.filter((s) => s !== sheet);
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
function targetAt(x: number, y: number): HTMLElement | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.closest("[data-spotnote-ui]")) continue; // skip our own overlay/UI
    const hit = el.closest<HTMLElement>("[data-spotnote]"); // walk up to nearest annotated node
    if (hit) return hit;
  }
  return null;
}

// mousemove can fire several times per frame; resolve the target once per frame.
function onMove(e: MouseEvent) {
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
function updateHover(animate: boolean) {
  if (!active || !lastPointer || lastPointer.own) return hideHover();
  const el = targetAt(lastPointer.x, lastPointer.y);
  if (!el) return hideHover();
  drawHover(el, animate);
}

function onClick(e: MouseEvent) {
  if (overOwnUI(e)) return; // let our own UI handle its own clicks
  const el = active ? targetAt(e.clientX, e.clientY) : null;
  const panel = panelEl();
  if (panel) {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey && el) return toggleMore(el);
    if (el === panelTarget()) return;
    // Unsent text survives the first click away: nudge instead.
    if (panelHasDraft()) return nudgePanel(panel);
    if (!el) return closePanel();
  }
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();

  selection.raw = e.target instanceof Element ? e.target : null; // may be deeper than `el`
  console.log("[spotnote] selected:", el.getAttribute("data-spotnote"));
  openPanel(el); // sets the selection + highlight for every open path
}

// ── Keep the selection across HMR ─────────────────────────────────────
function rebindSelection() {
  if (!selection.loc) return;
  const el = resolveRef(selection.loc, selection.index);
  if (el) {
    selection.el = el;
    drawSelect(el);
    console.log("[spotnote] selection re-bound after edit:", selection.loc);
  } else {
    console.warn("[spotnote] selection lost after edit (data-spotnote changed):", selection.loc);
    removeSelect();
    selection.el = null;
    selection.loc = null;
  }
  notify();
}

function reposition() {
  // The page moved under a still pointer: re-resolve what's under it now.
  if (pointerBound) updateHover(false);
  repositionSelect();
  repositionMoreBoxes();
  repositionPins();
  followTarget();
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
