// The note panel's frame: drag it, resize it (every note's panel keeps the
// size), and shake it. `onMoved` tells the inspector the user placed the panel,
// so it stops re-anchoring it to its element.

// Drag the panel from anywhere on it — except the note input (typing / caret /
// text selection) and buttons (their own clicks). Once moved, it stays put
// instead of snapping back to the target on scroll.
// A drag that ends off the panel still fires a click on the page, which would
// close the panel or pick an element. Eat that one click (it fires right after
// mouseup, before any timer).
function swallowNextClick() {
  const eat = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener("click", eat, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", eat, true), 0);
}

export function enablePanelDrag(panelEl, onMoved) {
  panelEl.addEventListener("mousedown", (e) => {
    if (
      !(e.target instanceof Element) ||
      e.target.closest("[data-spotnote-input]") ||
      e.target.closest("button, .sn-chip")
    )
      return;
    e.preventDefault(); // no text selection while dragging
    const startX = e.clientX;
    const startY = e.clientY;
    const r = panelEl.getBoundingClientRect();
    const ox = r.left;
    const oy = r.top;
    onMoved();
    const onMove = (ev) => {
      const left = Math.max(8, Math.min(ox + (ev.clientX - startX), window.innerWidth - panelEl.offsetWidth - 8));
      const top = Math.max(8, Math.min(oy + (ev.clientY - startY), window.innerHeight - panelEl.offsetHeight - 8));
      panelEl.style.left = left + "px";
      panelEl.style.top = top + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      swallowNextClick();
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  });
}

// ── Panel size: drag the bottom-right grip; every note's panel keeps it ──
const SIZE_KEY = "data-spotnote-panel-size";
const MIN_W = 260;
const MIN_H = 140;
function savedPanelSize() {
  try {
    const s = JSON.parse(localStorage.getItem(SIZE_KEY) || "null");
    return s && s.w > 0 && s.h > 0 ? s : null;
  } catch {
    return null;
  }
}
export function applyPanelSize(panelEl) {
  const s = savedPanelSize();
  if (!s) return;
  panelEl.classList.add("sn-sized");
  panelEl.style.width = Math.max(MIN_W, Math.min(s.w, innerWidth - 16)) + "px";
  panelEl.style.height = Math.max(MIN_H, Math.min(s.h, innerHeight - 16)) + "px";
}
export function enablePanelResize(panelEl, onMoved) {
  const grip = document.createElement("div");
  grip.className = "sn-resize";
  // hardcoded SVG: two diagonal strokes
  grip.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M13 7l-6 6M13 11l-2 2"/></svg>';
  panelEl.append(grip);
  grip.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation(); // not a panel drag
    const r = panelEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    onMoved(); // stay where it is, don't re-anchor to the target
    panelEl.style.left = r.left + "px";
    panelEl.style.top = r.top + "px";
    panelEl.classList.add("sn-sized");
    const onMove = (ev) => {
      panelEl.style.width = Math.max(MIN_W, Math.min(r.width + ev.clientX - startX, innerWidth - r.left - 8)) + "px";
      panelEl.style.height = Math.max(MIN_H, Math.min(r.height + ev.clientY - startY, innerHeight - r.top - 8)) + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      swallowNextClick();
      try {
        localStorage.setItem(SIZE_KEY, JSON.stringify({ w: panelEl.offsetWidth, h: panelEl.offsetHeight }));
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onUp, true);
  });
}

// "You have an unsent note": a short shake (a border flash under reduced motion).
export function nudgePanel(panel) {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cs = getComputedStyle(panel); // keyframes need resolved colours, not var()
  panel.animate(
    still
      ? [{ borderColor: cs.getPropertyValue("--sn-accent") }, { borderColor: cs.getPropertyValue("--sn-border") }]
      : [0, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: still ? 600 : 320, easing: "ease-out" },
  );
}
