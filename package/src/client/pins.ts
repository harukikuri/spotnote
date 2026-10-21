// The notes on this page and their pins: the markers left on elements that
// have a note, numbered like the launcher's notes list. Notes are saved in
// localStorage (they survive reloads and page changes) and, while spotnote-mcp
// runs, kept in sync with it: then its snapshots are the truth.
import { uiRoot } from "./ui.ts";
import { STATE_ICONS } from "./icons.ts";
import { parseLoc, refKey, resolveRef, buildPrompt, savedPrompt } from "./prompt.ts";
import { closePanel, openPanel, openPanelKey, refreshPanel } from "./panel.ts";
import { agentConnected, app, notify, pageUrl, pins, present, sameRef, selection, targetsOf } from "./state.ts";
import type { Message, Note, NoteState, Pin, Ref } from "./types.ts";

const PINS_KEY = "data-spotnote-pins"; // notes persist across reloads / navigation

// A pin holds its number (or a state icon), filled in by repositionPins, since
// deleting a pin renumbers the rest.
function makePinEl() {
  const m = document.createElement("div");
  m.setAttribute("data-spotnote-ui", "");
  m.className = "sn-pin";
  m.append(document.createElement("span"));
  return m;
}

// The note an element is on: its own, or one it was added to.
export function noteKeyOf(occ: Ref): string {
  const key = refKey(occ.loc, occ.index);
  if (pins.has(key)) return key;
  for (const [k, p] of pins) if (p.more?.some((t) => sameRef(t, occ))) return k;
  return key;
}

// ── Persistence: notes survive reloads and page navigation ───────────
function savePins() {
  try {
    const data = [...pins.entries()].map(([key, p]) => ({
      key,
      loc: p.loc,
      index: p.index,
      more: p.more,
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

// A note as the webhook gets it (see webhook.ts).
export function forWebhook(key: string, p: Pin, prompt: string) {
  return {
    key,
    text: p.note,
    page: location.origin + p.url,
    targets: targetsOf(p).map((t) => ({ ...parseLoc(t.loc), instance: t.index + 1 })),
    commit: app.builtFrom,
    prompt,
  };
}

// A note as spotnote-mcp gets it.
export function wire(key: string, p: Pin): Omit<Note, "working"> {
  return {
    key,
    loc: p.loc,
    index: p.index,
    more: p.more ?? [],
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
export function applySnapshot(list: Note[]): void {
  const next = new Map<string, Pin>();
  for (const n of list) {
    const pin = pins.get(n.key) ?? {
      loc: n.loc,
      index: n.index,
      note: n.note,
      marker: makePinMarker(n.key, n.loc, n.index),
    };
    const moved = JSON.stringify(n.more ?? []) !== JSON.stringify(pin.more ?? []);
    Object.assign(pin, {
      loc: n.loc,
      index: n.index,
      more: n.more ?? [],
      note: n.note,
      url: n.url,
      prompt: n.prompt,
      thread: n.thread,
      done: n.done,
      dismissed: n.dismissed,
      working: n.working,
      updated: n.updated,
    });
    if (moved || !pin.extra) syncExtra(n.key, pin);
    showState(pin);
    next.set(n.key, pin);
  }
  for (const [key, pin] of pins) if (!next.has(key)) markersOf(pin).forEach((m) => m.remove());
  pins.clear();
  next.forEach((pin, key) => pins.set(key, pin));
  savePins(); // the offline copy
  repositionPins();
  notify();
  refreshPanel();
}

// The server (and with it the agent) went away: nobody is working on anything.
export function agentGone(): void {
  pins.forEach((pin) => (pin.working = false) || showState(pin));
  repositionPins();
  notify();
}

// ── The conversation on a note (see spotnote-mcp) ──────────────────────────
// pin.thread: [{ id, from: "agent" | "you", text, at, resolves?, dismisses? }].
// The note itself is the opening message; resolves marks the agent's "done"
// summary, dismisses its reason for not making the change.
// "done", "dismissed" (the agent won't), "asked" (it's waiting on you),
// "working" (an agent has it) or "open".
export function pinState(pin: Pin): NoteState {
  if (pin.done) return "done";
  if (pin.dismissed) return "dismissed";
  if (pin.thread?.at(-1)?.from === "agent") return "asked";
  return pin.working ? "working" : "open";
}

// Your answer to the agent. Replying on a done note reopens it.
export function replyNote(key: string, text: string): void {
  const pin = pins.get(key);
  if (!pin) return;
  const msg: Message = { id: Math.random().toString(36).slice(2), from: "you", text, at: Date.now() };
  if (!agentConnected()) msg.pending = true; // sent with the rest of this note on reconnecting (merge)
  (pin.thread ??= []).push(msg);
  Object.assign(pin, { done: false, dismissed: false, working: false, updated: Date.now() });
  showState(pin);
  savePins();
  app.remote?.send({ op: "reply", key, text });
  repositionPins();
  notify();
}

function showState(pin: Pin) {
  const state = pinState(pin);
  for (const m of markersOf(pin))
    for (const s of ["done", "dismissed", "asked", "working"]) m.classList.toggle(`sn-${s}`, state === s);
}
const markersOf = (pin: Pin) => [pin.marker, ...(pin.extra ?? []).map((x) => x.marker)];
// A pin on each of the note's other elements (its `more`), made again from scratch.
function syncExtra(key: string, pin: Pin) {
  for (const x of pin.extra ?? []) x.marker.remove();
  pin.extra = (pin.more ?? []).map((t) => ({ ...t, marker: makePinMarker(key, t.loc, t.index) }));
}
// Bring back the notes saved on a previous visit to this page or app.
export function restorePins(): void {
  let saved: (Note | null)[] = [];
  try {
    saved = JSON.parse(localStorage.getItem(PINS_KEY) || "[]");
  } catch {
    saved = [];
  }
  for (const s of saved) {
    if (!s || pins.has(s.key)) continue;
    const marker = makePinMarker(s.key, s.loc, s.index);
    const pin: Pin = {
      loc: s.loc,
      index: s.index,
      more: s.more ?? [],
      note: s.note,
      url: s.url,
      prompt: s.prompt,
      done: s.done,
      dismissed: s.dismissed,
      thread: s.thread,
      updated: s.updated,
      marker,
    };
    pins.set(s.key, pin);
    syncExtra(s.key, pin);
    showState(pin);
  }
  repositionPins();
}

// Build a pin's DOM marker + its reopen-on-click handler.
function makePinMarker(key: string, loc: string, index: number) {
  const marker = makePinEl();
  marker.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // A pin toggles its note: closes it when it's the one open (like ×),
    // otherwise opens it (moving the panel over from another note).
    if (openPanelKey() === key) return closePanel();
    const p = pins.get(key);
    const el = resolveRef(loc, index);
    if (el && p) openPanel(el, p.note);
  });
  uiRoot().append(marker);
  return marker;
}

// `ref`: the element the note is keyed by; `more`: the others it's on.
export function upsertPin(ref: Ref, note: string, more: Ref[] = []): void {
  const key = refKey(ref.loc, ref.index);
  let pin = pins.get(key);
  if (!pin) {
    const marker = makePinMarker(key, ref.loc, ref.index);
    pin = { loc: ref.loc, index: ref.index, note, url: pageUrl(), marker };
    pins.set(key, pin);
  } else {
    if (note !== pin.note) {
      // A rewritten note is a new request: start its conversation over.
      Object.assign(pin, { done: false, dismissed: false, working: false, thread: [] });
    }
    pin.note = note;
  }
  pin.more = more.map(({ loc, index }) => ({ loc, index }));
  syncExtra(key, pin);
  showState(pin);
  // Keep the last full prompt, so the note can still be copied after an edit
  // moves its element away (see savedPrompt).
  const els = targetsOf(pin).map((t) => resolveRef(t.loc, t.index));
  if (els[0]) pin.prompt = buildPrompt(els.filter(present), note, selection.raw);
  pin.updated = Date.now();
  savePins();
  app.remote?.send({ op: "upsert", note: wire(key, pin) });
  repositionPins();
  notify();
}

export function deletePin(key: string): void {
  const pin = pins.get(key);
  if (!pin) return;
  // Shrink away, then drop the node (timeout covers reduced motion / hidden pins).
  for (const m of markersOf(pin)) {
    m.classList.add("sn-leaving");
    m.addEventListener("animationend", () => m.remove(), { once: true });
    setTimeout(() => m.remove(), 200);
  }
  pins.delete(key);
  savePins();
  app.remote?.send({ op: "remove", key });
  repositionPins(); // renumber the rest
}

export function repositionPins(): void {
  let n = 0;
  for (const [, pin] of pins) {
    n++; // same order as the launcher's notes list
    // Its number, or an icon for where it stands. data-mark skips redundant redraws.
    const state = pinState(pin);
    const label = STATE_ICONS[state] ? state : String(n);
    // The same pin on each of the note's elements.
    for (const { marker, loc, index } of [
      { marker: pin.marker, loc: pin.loc, index: pin.index },
      ...(pin.extra ?? []),
    ]) {
      const span = marker.firstChild as HTMLSpanElement;
      if (span.dataset.mark !== label) {
        span.dataset.mark = label;
        if (STATE_ICONS[state])
          span.innerHTML = STATE_ICONS[state]; // hardcoded SVG constants
        else span.textContent = label;
      }
      const el = resolveRef(loc, index);
      if (app.pinsVisible && el?.isConnected) {
        const r = el.getBoundingClientRect();
        marker.style.display = "";
        marker.style.left = r.left + window.scrollX - 11 + "px";
        marker.style.top = r.top + window.scrollY - 11 + "px";
      } else {
        marker.style.display = "none";
      }
    }
  }
}
