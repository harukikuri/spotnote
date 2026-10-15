// The launcher's Notes popover: every note, this page's first, each other
// page's under its path; tick notes to delete them, or open one.
import { el } from "./ui.js";
import { ICONS, FRAMEWORKS, fwIcon, agentMark, MENU_ICONS } from "./icons.js";
import { confirmOver } from "./confirm.js";

// Fills `pop` (an empty popover) and returns { render }. `onOpen` runs before a
// note is opened from the list (the launcher closes the popover).
export function createNotesList(pop, ctrl, { onOpen }) {
  // Same header as Settings: a title (with the count, muted) over a rule.
  const notesHead = el("div", "snl-head", pop);
  el("span", "snl-title", notesHead).textContent = "Notes";
  const notesCount = el("span", "snl-count", notesHead);
  const notesActs = el("span", "snl-head-acts", notesHead);
  const list = el("ol", "", pop);
  const empty = el("p", "snl-empty", pop);
  empty.textContent = "No notes yet. Click an element on the page to add one.";

  const collapsed = new Set(); // folded sections of the notes list: "here" or a page's url
  const picked = new Set(); // notes ticked for deleting

  // The header's delete button, a trash icon: with "(n)" for the ticked notes,
  // "(all)" for all of them. Both ask first, over the dimmed list.
  function renderNotesActions() {
    const keys = new Set(ctrl.notes().map((n) => n.key));
    for (const k of picked) if (!keys.has(k)) picked.delete(k);
    notesActs.textContent = "";
    if (!keys.size) return;
    const b = el("button", "snl-del", notesActs);
    // The ticked notes, or with none ticked, all of them; asked first.
    const doomed = picked.size ? [...picked] : [...keys];
    const count = doomed.length === 1 ? "1 note" : `${doomed.length} notes`;
    b.title = picked.size ? `Delete ${count}` : "Delete all";
    b.setAttribute("aria-label", b.title);
    b.innerHTML = ICONS.trash; // hardcoded SVG constants, not user input
    el("span", "snl-del-n", b).textContent = picked.size ? `(${picked.size})` : "(all)";
    b.addEventListener("click", () =>
      confirmOver(pop, {
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
      el("span", "snl-fold", b).innerHTML = MENU_ICONS.next; // hardcoded SVG constants
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
        onOpen();
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

  return { render: renderNotes };
}
