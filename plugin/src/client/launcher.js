// Launcher — matches the Spotnote toolbar spec: a compact vertical icon rail
// (radius 10, padding 4, #444 dividers, 32px round #999 buttons) with
// minimize · inspect · notes. Notes opens as a popover.
// Smooth collapse/expand, draggable, position persisted.
//
// Driven by a controller from the inspector:
//   { toggleInspect, isInspecting, setPinsVisible, notes, openNote, onChange }
import { T, createIconBtn } from "./ui.js";

const POS_KEY = "data-spotnote-launcher-pos";
const MIN_KEY = "data-spotnote-launcher-min";

// Exact icons from the spec.
const LI = {
  // A "+" — rotating it 45° yields "×". One glyph, two states.
  plus:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  inspect:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>',
  list:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
};

function d(parent, css, text) {
  const e = document.createElement("div");
  e.setAttribute("data-spotnote-ui", "");
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  if (parent) parent.append(e);
  return e;
}

export function mountLauncher(ctrl) {
  const wrap = d(document.body, `position:fixed;z-index:2147483647;font-family:${T.font};user-select:none;animation:dl-fade .2s ease`);
  let pos = null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) pos = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (pos) {
    wrap.style.top = pos.top + "px";
    wrap.style.left = pos.left + "px";
  } else {
    // Default: bottom-left, so it clears the app's top nav/header.
    wrap.style.bottom = "16px";
    wrap.style.left = "16px";
  }

  let popover = null; // "notes" | null
  let minimized = false;

  // ── Rail (spec styling) ──
  const rail = d(
    wrap,
    "display:flex;flex-direction:column;align-items:center;gap:0;padding:4px;cursor:grab;" +
      "background:#1a1a1a;border:1px solid #333;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.4)",
  );

  const railBtn = (parent, svg, tip, onClick) => {
    const b = createIconBtn({ svg, title: tip, parent, size: 32, onClick });
    b.style.borderRadius = "50%";
    b.style.color = "#999";
    return b;
  };
  const divider = (parent) =>
    d(parent, "width:20px;height:1px;background:#444;margin:4px auto;align-self:center");

  const topBtn = railBtn(rail, LI.plus, "Minimize", () => setMin(!minimized));

  // Collapsible tool group (animated on minimize).
  const tools = d(rail, "overflow:hidden;display:flex;flex-direction:column;align-items:center;transition:max-height .24s cubic-bezier(.4,0,.2,1),opacity .18s ease");
  divider(tools);
  const inspectBtn = railBtn(tools, LI.inspect, "Inspect mode (or hold Alt)", () => ctrl.toggleInspect());
  const notesBtn = railBtn(tools, LI.list, "Notes", () => togglePop("notes"));

  // ── Popover (notes) ──
  const pop = d(
    wrap,
    "position:absolute;left:100%;bottom:0;margin-left:10px;width:220px;overflow:hidden;" +
      `background:${T.bg};border:1px solid ${T.border};border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);` +
      "transform-origin:left bottom;opacity:0;transform:scale(.96);pointer-events:none;transition:opacity .16s ease,transform .16s ease",
  );
  const popTitle = d(pop, `padding:9px 12px;border-bottom:1px solid ${T.borderSubtle};font-size:13px;font-weight:600;color:${T.text}`);
  const popBody = d(pop, "padding:12px;max-height:260px;overflow-y:auto");

  function togglePop(which) {
    popover = popover === which ? null : which;
    render();
  }

  function setActive(btn, on) {
    if (on) {
      btn.setAttribute("data-active", "1");
      btn.style.background = `rgba(${T.accentRgb},0.08)`;
      btn.style.color = T.accent;
    } else {
      btn.removeAttribute("data-active");
      btn.style.background = "none";
      btn.style.color = "#999";
    }
  }

  function setMin(v) {
    minimized = v;
    localStorage.setItem(MIN_KEY, v ? "1" : "0");
    ctrl.setPinsVisible(!v); // minimized launcher hides the pins too
    if (v) {
      popover = null;
      tools.style.maxHeight = "0";
      tools.style.opacity = "0";
      topBtn.style.transform = "rotate(0deg)"; // "+"
      topBtn.title = "Open Spotnote";
    } else {
      tools.style.maxHeight = tools.scrollHeight + "px";
      tools.style.opacity = "1";
      topBtn.style.transform = "rotate(45deg)"; // "×"
      topBtn.title = "Minimize";
    }
    render();
  }

  function render() {
    setActive(inspectBtn, ctrl.isInspecting());
    setActive(notesBtn, popover === "notes");
    const show = popover && !minimized;
    pop.style.opacity = show ? "1" : "0";
    pop.style.transform = show ? "scale(1)" : "scale(.96)";
    pop.style.pointerEvents = show ? "auto" : "none";
    if (show) renderPop();
  }

  function renderPop() {
    popBody.textContent = "";
    const notes = ctrl.notes();
    popTitle.textContent = `Notes${notes.length ? ` (${notes.length})` : ""}`;
    if (!notes.length) {
      d(popBody, `font-size:12px;color:${T.textMuted}`, "No notes yet — select an element and add one.");
      return;
    }
    notes.forEach((n, i) => {
      const row = d(popBody, `padding:8px 0;cursor:pointer;${i ? `border-top:1px solid ${T.borderSubtle}` : ""}`);
      const label = n.loc.split("/").pop() + (n.index > 0 ? ` · #${n.index + 1}` : "");
      d(row, `font-family:${T.mono};font-size:11px;color:#a5b4fc;margin-bottom:2px`, label);
      d(row, `font-size:12px;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, n.note);
      row.addEventListener("click", () => {
        popover = null;
        render();
        ctrl.openNote(n.key);
      });
    });
  }

  function savePos() {
    const r = wrap.getBoundingClientRect();
    pos = { top: r.top, left: r.left };
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }
  makeDraggable(wrap, rail, savePos);

  // Esc closes the open popover, consumed so it can't cascade.
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && popover) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        popover = null;
        render();
      }
    },
    true,
  );

  ctrl.onChange(render);
  tools.style.maxHeight = localStorage.getItem(MIN_KEY) === "1" ? "0" : tools.scrollHeight + "px";
  setMin(localStorage.getItem(MIN_KEY) === "1");
  render();
  // Enable the +/× rotation only after the initial state (no spin on mount).
  topBtn.style.transition = "transform .24s cubic-bezier(.4,0,.2,1)";

  function flash(msg) {
    const t = d(
      wrap,
      "position:absolute;bottom:100%;left:0;margin-bottom:8px;white-space:nowrap;animation:dl-fade .15s ease;" +
        `background:${T.accent};color:#fff;font-size:12px;padding:5px 10px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.4)`,
      msg,
    );
    setTimeout(() => t.remove(), 1500);
  }
  return { flash };
}

function makeDraggable(target, handle, onEnd) {
  // Grab anywhere on the rail — buttons included. A press only becomes a drag
  // once the pointer moves past a small threshold; below it, the button click
  // fires as normal. A real drag swallows the trailing click so it can't
  // trigger the control it started on.
  const THRESH = 4;
  let sx = 0, sy = 0, ox = 0, oy = 0, armed = false, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const r = target.getBoundingClientRect();
    sx = e.clientX;
    sy = e.clientY;
    ox = r.left;
    oy = r.top;
    armed = true;
    dragging = false;
  });
  document.addEventListener("mousemove", (e) => {
    if (!armed) return;
    if (!dragging) {
      if (Math.abs(e.clientX - sx) < THRESH && Math.abs(e.clientY - sy) < THRESH) return;
      dragging = true; // threshold crossed → this is a drag, not a click
    }
    e.preventDefault();
    target.style.bottom = ""; // switch from the default bottom-anchor to top/left
    target.style.left = ox + (e.clientX - sx) + "px";
    target.style.top = oy + (e.clientY - sy) + "px";
  });
  document.addEventListener("mouseup", () => {
    if (!armed) return;
    armed = false;
    if (!dragging) return; // no movement → let the button's click through
    dragging = false;
    // Swallow the click that follows this drag so it doesn't hit the control.
    const swallow = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    document.addEventListener("click", swallow, true);
    setTimeout(() => document.removeEventListener("click", swallow, true), 0);
    if (onEnd) onEnd();
  });
}
