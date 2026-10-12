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
import { ICONS, ACCENTS, FRAMEWORKS, fwIcon, uiRoot, agentMark } from "./ui.js";
import { getSettings, setSetting, EDITORS } from "./settings.js";
import { createLayer } from "./layers.js";
import { confirmOver } from "./confirm.js";

const CORNER_KEY = "data-spotnote-launcher-corner";
const INSET = 44; // core centre ↔ viewport edges
// Fan start angle per corner (screen coords, y down, so +angle = clockwise).
// The fan sweeps +90° from here, which always points into the page.
const START = { bl: -90, br: 180, tr: 90, tl: 0 };

const svg = (attrs, body) => `<svg width="18" height="18" viewBox="0 0 24 24" ${attrs}>${body}</svg>`;
const LINE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const S16 = (body) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
// Settings: theme (one icon per choice), help, chevrons.
const SET_ICON = {
  system: S16('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  light: S16('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  dark: S16('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  help: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5"/><path d="M12 16.5h.01"/></svg>',
  next: S16('<path d="M9 6l6 6-6 6"/>'),
  back: S16('<path d="M15 6l-6 6 6 6"/>'),
  // GitHub's mark (Simple Icons, CC0)
  github:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
};
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
  // Same header as Settings: a title (with the count, muted) over a rule.
  const notesHead = el("div", "snl-head", notesPop);
  el("span", "snl-title", notesHead).textContent = "Notes";
  const notesCount = el("span", "snl-count", notesHead);
  const notesActs = el("span", "snl-head-acts", notesHead);
  const list = el("ol", "", notesPop);
  const empty = el("p", "snl-empty", notesPop);
  const settingsPop = popover("snl-settings", "Settings");
  settingsPop.item = gear.b;
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
    if (settingsPop.classList.contains("snl-show")) renderMcp();
  }

  function setOpen(v) {
    open = v;
    if (!v) togglePop(null);
    ctrl.setPinsVisible(v);
    ctrl.setInspect(v); // open = selecting, closed = not
    render();
  }

  // ── Popovers: at most one open; togglePop(null) closes it ──
  // The open one is a light-dismiss layer (layers.js): it stacks with the note
  // panel, Esc closes it, and a press on the page closes it.
  const menuLayer = createLayer({ close: () => togglePop(null), lightDismiss: true });
  function togglePop(which) {
    let shown = null;
    for (const p of [notesPop, settingsPop]) {
      const show = p === which && !p.classList.contains("snl-show");
      p.classList.toggle("snl-show", show);
      if (!show && p.classList.contains("sn-confirming")) {
        // An open question goes with it.
        p.querySelector(".sn-confirm").remove();
        p.classList.remove("sn-confirming");
      }
      p.item.setAttribute("aria-expanded", show);
      if (show && p === settingsPop) page = "main";
      if (show) (p === notesPop ? renderNotes : renderSettings)();
      if (show) shown = p;
    }
    // The launcher root is the popovers' stacking context, so it takes the z-index.
    if (shown) menuLayer.show(root, shown);
    else menuLayer.hide();
  }
  const collapsed = new Set(); // folded sections of the notes list: "here" or a page's url
  const picked = new Set(); // notes ticked for deleting

  // The header's delete button: "Delete (n)" for the ticked notes, otherwise
  // "Delete all". Both ask first, over the dimmed list.
  function renderNotesActions() {
    const keys = new Set(ctrl.notes().map((n) => n.key));
    for (const k of picked) if (!keys.has(k)) picked.delete(k);
    notesActs.textContent = "";
    if (!keys.size) return;
    const b = el("button", "snl-del", notesActs);
    // The ticked notes, or with none ticked, all of them; asked first.
    const doomed = picked.size ? [...picked] : [...keys];
    const count = doomed.length === 1 ? "1 note" : `${doomed.length} notes`;
    b.textContent = picked.size ? `Delete (${picked.size})` : "Delete all";
    b.addEventListener("click", () =>
      confirmOver(notesPop, {
        title: picked.size ? `Delete ${count}?` : `Delete all ${count}?`,
        body: "This can't be undone.",
        action: "Delete",
        onConfirm: () => {
          for (const k of doomed) ctrl.deleteNote(k);
          picked.clear();
          renderNotesActions();
        },
      }),
    );
  }

  function renderNotes() {
    const all = ctrl.notes();
    notesCount.textContent = all.length ? `(${all.length})` : "";
    list.textContent = "";
    // This page's notes first, then each other page's under its path. Numbers
    // stay as on the pins.
    const numbered = all.map((n, i) => ({ ...n, number: i + 1 }));
    const here = numbered.filter((n) => n.here);
    const pages = new Map();
    for (const n of numbered) if (!n.here) pages.set(n.url, [...(pages.get(n.url) ?? []), n]);
    // Each heading folds its section: click to collapse or expand (remembered
    // while the page is open).
    const section = (key, title, notes) => {
      const li = el("li", "snl-group", list);
      const b = el("button", "", li);
      const open = !collapsed.has(key);
      b.setAttribute("aria-expanded", open);
      el("span", "snl-fold", b).innerHTML = SET_ICON.next; // hardcoded SVG constants
      el("span", "snl-group-title", b).textContent = title;
      el("span", "snl-count", b).textContent = `(${notes.length})`;
      b.addEventListener("click", () => {
        if (open) collapsed.add(key);
        else collapsed.delete(key);
        renderNotes();
      });
      if (open) notes.forEach(addRow);
    };
    if (here.length) section("here", "This page", here);
    for (const [url, notes] of pages) section(url, url, notes);
    empty.hidden = all.length > 0;
    renderNotesActions();
  }
  function addRow(n) {
    const li = el("li", [n.lost && "snl-lost", n.state !== "open" && `snl-${n.state}`].filter(Boolean).join(" "), list);
    // A checkbox to pick notes for deleting (see renderNotesActions).
    const pick = el("input", "snl-pick", li);
    pick.type = "checkbox";
    pick.checked = picked.has(n.key);
    pick.setAttribute("aria-label", `Select note ${n.number}`);
    pick.addEventListener("click", (e) => e.stopPropagation()); // not "open the note"
    pick.addEventListener("change", () => {
      if (pick.checked) picked.add(n.key);
      else picked.delete(n.key);
      renderNotesActions();
    });
    const src = el("span", "snl-src", li);
    const num = el("span", "snl-num", src); // same as its pin: its number, or a state icon
    if (n.mark) num.innerHTML = n.mark; // hardcoded SVG constants, not user input
    else num.textContent = String(n.number);
    const kind = ctrl.fileKind(n.loc.replace(/:\d+:\d+$/, "")); // drop :line:col
    const mark = el("span", "snl-fw", src);
    mark.style.color = FRAMEWORKS[kind].color;
    mark.title = FRAMEWORKS[kind].name;
    mark.innerHTML = fwIcon(kind); // hardcoded SVG constants, not user input
    el("span", "", src).textContent = n.loc.split("/").pop() + (n.index > 0 ? ` · #${n.index + 1}` : "");
    el("span", "snl-txt", li).textContent = n.note;
    if (n.state === "working") {
      // Who has it; what the agent then says is on the note, not here.
      const sum = el("span", "snl-sum", li);
      sum.textContent = sum.title = `${agentMark(n.client)?.name ?? "Agent"} is on it…`;
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
  // Settings: a header (name + theme), then rows of label · value, grouped by
  // thin rules. What a row does is behind its (?), not spelled out underneath.
  // The coding agent row opens its own page, with how to connect.
  let page = "main"; // or "agent"
  const THEMES = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];
  function label(parent, text, help) {
    const l = el("span", "snl-label", parent);
    l.append(text);
    if (!help) return l;
    const h = el("span", "snl-help", l);
    h.tabIndex = 0;
    h.setAttribute("aria-label", help);
    h.innerHTML = SET_ICON.help; // hardcoded SVG constants, not user input
    el("span", "snl-help-tip", h).textContent = help;
    h.addEventListener("click", (e) => e.stopPropagation()); // help only, even inside a row that's a button
    return l;
  }
  function renderSettings() {
    settingsPop.textContent = "";
    mcpBox = null;
    shownMcp = null;
    (page === "agent" ? renderAgentPage : renderMainPage)();
  }
  function renderMainPage() {
    const head = el("div", "snl-head", settingsPop);
    el("span", "snl-title", head).textContent = "Settings";
    // Theme: one button, cycling System → Light → Dark.
    const theme = getSettings().theme;
    const [, name] = THEMES.find(([k]) => k === theme) ?? THEMES[0];
    const tb = el("button", "snl-icon-btn", head);
    tb.title = `Theme: ${name} (Spotnote's panels, not your app)`;
    tb.setAttribute("aria-label", tb.title);
    tb.innerHTML = SET_ICON[theme] ?? SET_ICON.system; // hardcoded SVG constants
    tb.addEventListener("click", () => {
      const i = THEMES.findIndex(([k]) => k === theme);
      setSetting("theme", THEMES[(i + 1) % THEMES.length][0]);
      renderSettings();
    });

    // Coding agent → its page
    const agent = el("button", "snl-srow snl-link", settingsPop);
    label(agent, "Coding agent", "Lets your agent pick up notes and reply, without copy and paste (spotnote-mcp).");
    mcpBox = el("span", "snl-value", agent);
    renderMcp();
    agent.addEventListener("click", () => {
      page = "agent";
      renderSettings();
    });

    el("div", "snl-rule", settingsPop);
    const accent = el("div", "snl-srow", settingsPop); // swatches on the right, like the other rows' values
    label(accent, "Accent color", "The outline, labels and pins on your page.");
    choices(accent, "snl-swatches", "accent", Object.entries(ACCENTS).map(([k, a]) => [k, a.name]), (b, k, n) => {
      b.style.setProperty("--c", ACCENTS[k].accent);
      b.title = n;
      b.setAttribute("aria-label", n);
    });

    el("div", "snl-rule", settingsPop);
    const files = el("label", "snl-srow", settingsPop);
    label(files, "Open files in", "Where a file opens when you click its name in a note.");
    const select = el("select", "snl-select", files);
    for (const [key, { name: n }] of Object.entries(EDITORS)) {
      const o = el("option", "", select);
      o.value = key;
      o.textContent = n;
    }
    select.value = getSettings().editor;
    select.addEventListener("change", () => setSetting("editor", select.value));

    // Footer: which Spotnote this is, and where it lives.
    const about = ctrl.about;
    if (!about) return;
    const foot = el("div", "snl-foot", settingsPop);
    el("span", "", foot).textContent = `Spotnote v${about.version}`;
    const gh = el("a", "snl-icon-btn", foot);
    gh.href = about.repo;
    gh.target = "_blank";
    gh.rel = "noopener noreferrer";
    gh.title = "Spotnote on GitHub";
    gh.setAttribute("aria-label", gh.title);
    gh.innerHTML = SET_ICON.github; // hardcoded SVG constants, not user input
  }

  function renderAgentPage() {
    const head = el("div", "snl-head", settingsPop);
    const back = el("button", "snl-icon-btn snl-back", head);
    back.title = "Back";
    back.setAttribute("aria-label", "Back");
    back.innerHTML = SET_ICON.back; // hardcoded SVG constants
    back.addEventListener("click", () => {
      page = "main";
      renderSettings();
    });
    el("span", "snl-title", head).textContent = "Coding agent";
    const status = el("div", "snl-srow", settingsPop);
    label(status, "Status");
    mcpBox = el("span", "snl-value", status);
    mcpHelp = el("div", "snl-agent", settingsPop);
    renderMcp();
  }

  // Whether spotnote-mcp is running and has our notes (live, while Settings is
  // open). Not connected, the agent page says what connecting gives you and how.
  const MCP = {
    on: ["Connected", "Your agent picks up notes as you write them, and its replies show up on the note."],
    connecting: ["Connecting…", "Syncing your notes with your agent."],
    off: ["Not connected", "Connect your coding agent to hand it notes without copy and paste."],
  };
  // Not connected: how to connect, in two steps (as in the MCP guide).
  const MCP_STEPS = [
    ["Add Spotnote to Claude Code, once:", "claude mcp add spotnote -- npx -y spotnote-mcp", "snl-cmd-shell"],
    ["In a new Claude Code session, ask:", "Watch my Spotnote notes.", "snl-cmd-ask"],
  ];
  let mcpBox = null;
  let mcpHelp = null;
  let shownMcp = null;
  function renderMcp() {
    const status = ctrl.mcpStatus();
    if (!mcpBox || status === shownMcp) return;
    shownMcp = status;
    mcpBox.textContent = "";
    const line = el("span", `snl-mcp snl-mcp-${status}`, mcpBox);
    el("span", "snl-dot", line);
    line.append(MCP[status][0]);
    if (page === "main") {
      el("span", "snl-chev", mcpBox).innerHTML = SET_ICON.next; // hardcoded SVG constants
      return;
    }
    mcpHelp.textContent = "";
    el("p", "snl-para", mcpHelp).textContent = MCP[status][1];
    if (status !== "off") return;
    const steps = el("ol", "snl-steps", mcpHelp);
    for (const [text, copyText, kind] of MCP_STEPS) {
      const li = el("li", "", steps);
      el("p", "snl-step-text", li).textContent = text;
      const cmd = el("div", `snl-cmd ${kind}`, li);
      el("code", "", cmd).textContent = copyText;
      const copy = el("button", "", cmd);
      copy.title = "Copy";
      copy.setAttribute("aria-label", "Copy");
      copy.innerHTML = ICONS.copy; // hardcoded SVG constants, not user input
      copy.addEventListener("click", () => {
        navigator.clipboard?.writeText(copyText).catch(() => {});
        copy.innerHTML = ICONS.check;
        setTimeout(() => (copy.innerHTML = ICONS.copy), 1200);
      });
    }
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
  return { flash, open: () => setOpen(true) };
}
