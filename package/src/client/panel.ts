// The note panel: opened on an element to write a note, or, once an agent has
// it, its conversation with the agent. Its header has a chip per element the
// note is on (Shift-click adds or removes one); Enter sends.
import { createIconBtn, uiRoot } from "./ui.ts";
import { T } from "./styles.ts";
import { ICONS } from "./icons.ts";
import { renderMarkdown } from "./markdown.ts";
import { createLayer } from "./layers.ts";
import { confirmOver } from "./confirm.ts";
import { parseLoc, occInfo, refKey, resolveRef, buildPrompt } from "./prompt.ts";
import { postNote } from "./webhook.ts";
import { agentName, agentLabel, thinkingMsg } from "./conversation.ts";
import { openFile, hideTip } from "./open-file.ts";
import { enablePanelDrag, applyPanelSize, enablePanelResize } from "./panel-frame.ts";
import {
  ACCENT_RGB,
  drawSelect,
  overOwnUI,
  fileTag,
  mkBox,
  placeAbs,
  removeSelect,
  repositionSelect,
  selectBoxEl,
} from "./overlay.ts";
import { deletePin, forWebhook, noteKeyOf, replyNote, upsertPin } from "./pins.ts";
import { refreshPointer } from "./inspector.ts";
import { agentConnected, app, notify, pins, present, sameRef, selection, targetsOf } from "./state.ts";
import type { Message, Pin, Ref } from "./types.ts";

// What a note's panel is for:
//   "edit"     write or change the note (also a new one, with no pin yet)
//   "working"  an agent has it: show the conversation, no input until it answers
//   "talking"  the agent has answered: show the conversation, the input replies
type NoteMode = "edit" | "working" | "talking";
function noteMode(pin: Pin | undefined): NoteMode {
  if (!pin) return "edit";
  if (pin.working) return "working";
  return (pin.thread?.length ?? 0) > 0 || pin.done || pin.dismissed ? "talking" : "edit";
}

// The open panel, or null. Built by openPanel, dropped by closePanel.
interface OpenPanel {
  el: HTMLDivElement;
  target: HTMLElement; // the element it's anchored to
  key: string; // its note's key
  mode: NoteMode | "new"; // what it was built for ("new": a note not sent yet)
  dragged: boolean; // once dragged (or resized), it stops following its element
  // The note's elements: the one it's keyed by, the others added with
  // Shift-click, and whether they can change (not once an agent has the note).
  // Each but the clicked one gets a box of its own.
  primary: Ref;
  more: Ref[];
  moreLocked: boolean;
  showChips: () => void; // redraws the header's chips
  refresh: (() => void) | null; // redraws the conversation
  sync: () => void; // follows the agent (dis)connecting
  draft: () => boolean; // true while the note has unsent text
  save: (() => void) | null; // saves an edited note on close
}
let open: OpenPanel | null = null;
let moreBoxes: (HTMLDivElement & { ref: Ref })[] = [];

const panelLayer = createLayer({ close: () => closePanel() }); // stacking + Esc (layers.ts)

// For the other modules: whether a panel is open, and on what.
export const isPanelOpen = (): boolean => open !== null;
export const openPanelKey = (): string | null => open?.key ?? null;
export const panelTarget = (): HTMLElement | null => open?.target ?? null;
export const panelEl = (): HTMLDivElement | null => open?.el ?? null;
export const panelHasDraft = (): boolean => open?.draft() ?? false;
export const syncPanel = (): void => open?.sync();

// The open note's elements: their refs, and as they are on the page now.
const panelRefs = (): Ref[] => (open ? [open.primary, ...open.more] : []);
const panelEls = () =>
  panelRefs()
    .map((t) => resolveRef(t.loc, t.index))
    .filter(present);

// The open note's other elements: a box on each but the clicked one, which has
// the selection box.
function drawMoreBoxes() {
  moreBoxes.forEach((b) => b.remove());
  moreBoxes = [];
  if (!open) return;
  const clicked = { loc: selection.loc ?? "", index: selection.index };
  for (const ref of panelRefs()) {
    if (sameRef(ref, clicked)) continue;
    const box = Object.assign(mkBox(), { ref });
    uiRoot().append(box);
    moreBoxes.push(box);
  }
  repositionMoreBoxes();
}
export function repositionMoreBoxes(): void {
  for (const box of moreBoxes) {
    const el = resolveRef(box.ref.loc, box.ref.index);
    box.style.display = el ? "" : "none";
    if (el) placeAbs(box, el);
  }
}
// One of the open note's elements, lit up from its chip in the panel.
function boxOf(ref: Ref) {
  return sameRef(ref, { loc: selection.loc ?? "", index: selection.index })
    ? selectBoxEl()
    : moreBoxes.find((b) => sameRef(b.ref, ref));
}
function glow(ref: Ref, on: boolean) {
  const box = boxOf(ref);
  if (box) box.style.boxShadow = on ? `0 0 0 4px rgba(${ACCENT_RGB},0.45)` : "";
}
// Shift-click: put another element on the open note, or take it off again
// (any of them, as long as one is left).
export function toggleMore(el: Element): void {
  if (!open || open.moreLocked) return; // an agent has the note: its elements stay as sent
  const occ = occInfo(el);
  const ref = { loc: occ.loc, index: occ.index };
  const i = open.more.findIndex((t) => sameRef(t, ref));
  if (i >= 0) open.more.splice(i, 1);
  else if (!sameRef(ref, open.primary)) open.more.push(ref);
  else {
    const next = open.more.shift();
    if (!next) return;
    open.primary = next; // the next one keys the note
  }
  // Took off the element the panel opened on: select the note's first instead.
  if (!panelRefs().some((t) => sameRef(t, { loc: selection.loc ?? "", index: selection.index }))) {
    const first = resolveRef(open.primary.loc, open.primary.index);
    selection.el = first;
    if (first) open.target = first;
    selection.loc = open.primary.loc;
    selection.index = open.primary.index;
    selection.raw = null;
    if (first) drawSelect(first);
  }
  drawMoreBoxes();
  open.showChips();
}

// One of the note's elements, as a chip: tag.class, then file:line.
//   tag.class  lights up the element on the page (hover), and scrolls to it (click)
//   file:line  opens it in your editor
//   ×          takes it off the note (an added element, while you can still edit)
function chip(el: HTMLElement, ref: Ref, { base, removable }: { base: boolean; removable: boolean }) {
  const c = document.createElement("span");
  c.className = base ? "sn-chip sn-chip-base" : "sn-chip";
  c.title = "Show on the page";
  c.addEventListener("mouseenter", () => glow(ref, true));
  c.addEventListener("mouseleave", () => glow(ref, false));

  const name = document.createElement("span");
  name.className = "sn-chip-el";
  const tag = document.createElement("b");
  tag.textContent = el.tagName.toLowerCase();
  name.append(tag);
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean)[0] : "";
  if (cls) {
    // The class is the flexible bit — it ellipsizes so a long name can't
    // push the file:line out of the panel.
    const c2 = document.createElement("span");
    c2.className = "sn-chip-cls";
    c2.textContent = "." + cls;
    name.append(c2);
  }
  // The whole chip (but its file:line and ×) shows its element on the page.
  c.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".sn-loc, .sn-chip-rm")) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const box = boxOf(ref);
    box?.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 500, iterations: 2 });
  });
  c.append(name);

  const l = parseLoc(el.getAttribute("data-spotnote") ?? "");
  const loc = document.createElement("button");
  loc.type = "button";
  loc.className = "sn-loc";
  loc.title = `Open ${l.file}:${l.line} in your editor`;
  loc.append(fileTag(l.file, l.line));
  loc.addEventListener("click", () => openFile({ path: l.file, line: String(l.line), column: String(l.column) }, loc));
  c.append(loc);

  if (removable) {
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "sn-chip-rm";
    rm.title = "Take off this note";
    rm.innerHTML = ICONS.close; // hardcoded SVG constant, not user input
    rm.addEventListener("click", () => {
      glow(ref, false);
      toggleMore(el);
    });
    c.append(rm);
  }
  return c;
}

// The open note changed (from the server): redraw its conversation, or rebuild
// the panel in place when it moved between edit, working and talking.
export function refreshPanel(): void {
  if (!open || open.mode === "new") return; // a note still being written isn't on the server yet
  const pin = pins.get(open.key);
  if (!pin) {
    closePanel(); // deleted, here or in another browser
    return;
  }
  if (noteMode(pin) === open.mode) {
    open.refresh?.();
    return;
  }
  const moved = open.dragged && { left: open.el.style.left, top: open.el.style.top };
  openPanel(open.target, undefined, { instant: true });
  if (moved && open) {
    Object.assign(open.el.style, moved);
    open.dragged = true;
  }
}

export function openPanel(target: HTMLElement, prefillNote?: string | null, { instant = false } = {}): void {
  closePanel({ instant });
  const occ = occInfo(target);
  const key = noteKeyOf(occ); // the note it's on, maybe as one of several elements
  const isEdit = pins.has(key); // reopened an existing note
  const mode = noteMode(pins.get(key));
  // Once an agent has the note, the panel is a conversation: the input replies
  // instead of editing the note (and waits while the agent works).
  const talking = mode !== "edit";
  const saved = pins.get(key);
  // Clicking an element that already has a note edits it, so start from that
  // note — otherwise the save-on-close would overwrite it with fresh text.
  prefillNote = talking ? null : (prefillNote ?? pins.get(key)?.note);

  // Highlight the target whenever the panel is open — including reopens from a
  // pin or the notes list, not just a fresh click.
  selection.el = target;
  selection.loc = occ.loc;
  selection.index = occ.index;
  drawSelect(target);

  const panel = document.createElement("div");
  const p: OpenPanel = {
    el: panel,
    target,
    key,
    mode: isEdit ? mode : "new",
    dragged: false,
    primary: saved ? { loc: saved.loc, index: saved.index } : { loc: occ.loc, index: occ.index },
    more: [...(saved?.more ?? [])],
    moreLocked: talking,
    showChips: () => {},
    refresh: null,
    sync: () => {},
    draft: () => false,
    save: null,
  };
  open = p;
  const moreChanged = () => JSON.stringify([p.primary, ...p.more]) !== JSON.stringify(saved ? targetsOf(saved) : []);
  // Save the note; under its new first element's key when its first was taken off.
  const save = (note: string) => {
    if (refKey(p.primary.loc, p.primary.index) !== key) deletePin(key);
    upsertPin(p.primary, note, p.more);
  };

  panel.setAttribute("data-spotnote-ui", "");
  panel.className = "sn-panel";
  if (instant) panel.style.animation = "none"; // a rebuild in place, not a new panel

  // Header: label + icon buttons
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:flex-start;gap:4px;padding:7px 7px 7px 12px;border-bottom:1px solid ${T.borderSubtle}`;
  // The note's elements, one chip each (Shift-click adds or removes one).
  const chips = document.createElement("div");
  chips.className = "sn-chips";
  // Room to grab the header by, however many chips wrap.
  const grip = document.createElement("span");
  grip.style.cssText = "flex:1 0 16px;align-self:stretch";
  header.append(chips, grip);
  p.showChips = () => {
    chips.textContent = "";
    const refs = panelRefs();
    for (const ref of refs) {
      const el = resolveRef(ref.loc, ref.index);
      if (!el) continue; // not on this page
      const several = refs.length > 1;
      // Any can come off, but the last one.
      const removable = several && !p.moreLocked;
      chips.append(chip(el, ref, { base: several && ref === refs[0], removable }));
    }
  };
  p.showChips();
  let copyBtn: HTMLButtonElement | null = null;
  let copied: ReturnType<typeof setTimeout> | undefined;
  if (isEdit) {
    const btn = (copyBtn = createIconBtn({
      svg: ICONS.copy,
      title: "Copy prompt",
      parent: header,
      onClick: () => {
        const note = talking ? pins.get(key)?.note : (input.textContent || "").trim();
        if (!note) return;
        navigator.clipboard?.writeText(buildPrompt(panelEls(), note, selection.raw)).catch(() => {});
        btn.innerHTML = ICONS.check; // green tick feedback, then revert
        clearTimeout(copied);
        copied = setTimeout(() => {
          btn.innerHTML = ICONS.copy;
        }, 1200);
      },
    }));
    createIconBtn({
      svg: ICONS.trash,
      title: "Remove note",
      parent: header,
      onClick: () => askDelete(),
    });
  }
  createIconBtn({ svg: ICONS.close, title: "Close", parent: header, onClick: () => closePanel() });
  panel.append(header);

  // The conversation: your note, then the agent's and your messages.
  if (talking) {
    const thread = document.createElement("div");
    thread.className = "sn-thread";
    panel.append(thread);
    p.refresh = () => {
      const pin = pins.get(key);
      if (!pin) return;
      thread.textContent = "";
      hideTip(); // its icon may be gone
      const opening: Partial<Message> & Pick<Message, "from" | "text"> = { from: "you", text: pin.note };
      for (const m of [opening, ...(pin.thread ?? [])]) {
        const msg = document.createElement("div");
        msg.className = m.from === "agent" ? "sn-msg sn-msg-agent" : "sn-msg";
        const who =
          m.from === "agent"
            ? agentLabel(m.client)
            : Object.assign(document.createElement("span"), { className: "sn-who", textContent: "You" });
        if (m.dismisses) who.append(" · won't do");
        if (m.pending) who.append(" · not sent yet"); // written while the agent was away
        msg.append(who);
        // The agent writes Markdown; what you typed stays as typed.
        if (m.from === "agent") {
          const body = document.createElement("div");
          body.className = "sn-msg-body sn-md";
          body.append(renderMarkdown(m.text, openFile));
          msg.append(body);
        } else
          msg.append(Object.assign(document.createElement("div"), { className: "sn-msg-body", textContent: m.text }));
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
    p.refresh();
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
      if (!(e.target instanceof Element && e.target.closest("button"))) e.preventDefault(); // Enter still presses Delete
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
      p.refresh?.();
      return;
    }
    const prompt = buildPrompt(panelEls(), note, selection.raw);
    // With the agent connected, it gets the note directly: leave the clipboard be.
    if (!agentConnected()) {
      navigator.clipboard?.writeText(prompt).catch(() => {});
      console.log("[spotnote] copied prompt:\n" + prompt);
    }
    save(note); // leave a marker on each element
    const k = refKey(p.primary.loc, p.primary.index);
    const sent = pins.get(k);
    if (sent) postNote(isEdit ? "note.update" : "note.add", forWebhook(k, sent, prompt), panelEls());
    closePanel(); // selection mode stays on while the launcher is open
    app.launcher?.flash(); // ✓ on the launcher core
  }

  // No Cancel/Save footer: ×, Esc and an outside click all close. Enter (or
  // this hint) sends; an edited note also saves itself on close. A new note is
  // only kept once sent, so half-typed text never becomes a pin.
  const send = document.createElement("button");
  send.className = "sn-send";
  // Copying is for handing the prompt over by hand: not needed (and not shown)
  // while the agent is connected over MCP.
  p.sync = () => {
    const copy = !agentConnected();
    if (talking) {
      input.dataset.placeholder = copy ? `Sent once ${agentName(pins.get(key))} is back…` : "Reply to the agent…";
      p.refresh?.();
    }
    send.innerHTML = `<kbd>↵</kbd>${talking ? "Reply" : isEdit ? "Save" : "Add"}${copy && !talking ? " &amp; copy" : ""}`;
    if (copyBtn) copyBtn.style.display = copy ? "flex" : "none"; // its inline display beats [hidden]
  };
  p.sync();
  send.addEventListener("click", doSend);
  if (mode !== "working") inputWrap.append(send);
  const updateSend = () => (send.disabled = !(input.textContent || "").trim());
  input.addEventListener("input", updateSend);
  updateSend();
  // Unsent text — a new note, or an edit that differs from the saved note.
  p.draft = () => {
    const note = (input.textContent || "").trim();
    return mode !== "working" && !!note && (talking || note !== pins.get(key)?.note || moreChanged());
  };
  if (isEdit && !talking) {
    p.save = () => {
      const note = (input.textContent || "").trim();
      // Skip a note just deleted from this panel, and an emptied one.
      if (note && pins.has(key) && (note !== pins.get(key)?.note || moreChanged())) save(note);
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
  drawMoreBoxes();
  enablePanelDrag(panel, () => (p.dragged = true));
  enablePanelResize(panel, () => (p.dragged = true));
  refreshPointer();
  setTimeout(() => {
    if (mode === "working") return open?.el.focus();
    // Already in the input (clicked, or typing straight away): keep their caret
    // and selection rather than move it.
    if ((input.getRootNode() as ShadowRoot).activeElement === input) return;
    input.focus();
    // With a prefilled note, drop the caret at the END so editing continues
    // naturally (browsers otherwise place it at the start).
    if (prefillNote && input.firstChild) {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, 50);
  setTimeout(() => document.addEventListener("mousedown", onDocDown, true), 0);
}

export function positionPanel(target: Element): void {
  if (!open) return;
  const panel = open.el;
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

// The page re-rendered the panel's element (HMR) or removed it (a route
// change): follow its replacement, or close when it's gone. Then keep the
// panel next to it, unless it was dragged away.
export function followTarget(): void {
  if (!open) return;
  if (!open.target.isConnected) {
    const el = selection.loc ? resolveRef(selection.loc, selection.index) : null;
    if (!el) {
      closePanel();
      return;
    }
    open.target = selection.el = el;
    repositionSelect();
    repositionMoreBoxes();
  }
  if (!open.dragged) positionPanel(open.target);
}

// While a panel is open, a press on the page is held back too: no focus theft
// from the note, no text selection, no app mousedown handlers. onClick then
// decides what the click does (switch target, close, or nudge).
function onDocDown(e: MouseEvent) {
  if (!open || overOwnUI(e)) return;
  e.preventDefault();
  e.stopPropagation();
}

export function closePanel({ instant = false } = {}): void {
  if (!open) return;
  open.save?.();
  hideTip();
  document.removeEventListener("mousedown", onDocDown, true);
  // Play the exit animation on a detached reference; all state below resets now,
  // so nothing else ever sees a closing panel as open. inert drops its focus so
  // keystrokes can't land in it while it fades.
  if (!instant) panelLayer.hide(); // a rebuild keeps its place (openPanel swaps it)
  const leaving = open.el;
  leaving.inert = true;
  if (instant) leaving.remove(); // replaced in place (see refreshPanel)
  leaving.classList.add("sn-leaving");
  const done = () => leaving.remove();
  leaving.addEventListener("animationend", done, { once: true });
  setTimeout(done, 200); // reduced motion: no animation, so no animationend
  open = null;
  // A closed panel ends the transient selection (pins persist separately).
  removeSelect();
  moreBoxes.forEach((b) => b.remove());
  moreBoxes = [];
  selection.el = null;
  selection.loc = null;
  selection.index = 0;
  selection.raw = null;
  notify();
  // Deferred so the click that dismissed the panel can't immediately re-select.
  setTimeout(refreshPointer, 0);
}
