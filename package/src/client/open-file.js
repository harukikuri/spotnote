// File links (the panel's file:line, files the agent mentions) → your editor,
// and the warning shown next to a link that didn't open.
import { uiRoot } from "./ui.js";
import { ICONS } from "./icons.js";
import { getSettings, EDITORS } from "./settings.js";
import { parseLoc } from "./prompt.js";

// A file the agent mentioned → open it in your editor: the one picked in
// Settings (through its URL), or with "Auto" the one running (the dev server
// launches it). A bare name ("router.jsx") is looked up among the page's stamps
// first; the dev server then finds it on disk (see /__spotnote/open).
export async function openFile({ path, line, column }, button) {
  if (!path.includes("/")) {
    const known = new Set(
      [...document.querySelectorAll("[data-spotnote]")].map((e) => parseLoc(e.getAttribute("data-spotnote")).file),
    );
    const hits = [...known].filter((f) => f.split("/").pop() === path);
    if (hits.length === 1) path = hits[0];
  }
  const editor = EDITORS[getSettings().editor] ?? EDITORS.auto;
  const q = new URLSearchParams({
    path,
    ...(line && { line }),
    ...(column && { column }),
    ...(editor.scheme && { resolve: "1" }),
  });
  const res = await fetch(`/__spotnote/open?${q}`).catch(() => null);
  const body = res && (await res.json().catch(() => null));
  if (res?.status === 404) return fileProblem(button, "Couldn't find this file in your project", true);
  if (res?.status === 409) return fileProblem(button, "No editor is running. Pick yours in Settings → Open files in.");
  if (!res?.ok || !body?.file) return fileProblem(button, "Couldn't open this file.");
  clearFileProblem(button); // it worked this time: drop what an earlier try said
  // An editor picked in Settings, or the running one whose command-line tool
  // isn't installed (the dev server says which): open it through its URL.
  const scheme = editor.scheme ?? body.scheme;
  if (scheme) {
    const p = body.file.replace(/\\/g, "/");
    const a = document.createElement("a");
    a.href = `${scheme}://file${p.startsWith("/") ? "" : "/"}${p}${line ? `:${line}` : ""}${line && column ? `:${column}` : ""}`;
    a.click();
  }
}
function clearFileProblem(button) {
  button.classList.remove("sn-file-missing");
  if (button.dataset.title != null) button.title = button.dataset.title;
  if (button.nextSibling?.className === "sn-file-hint") button.nextSibling.remove();
  hideTip();
}
// Say why a file link didn't open: a warning icon right after it, with the
// reason on hover (or focus).
function fileProblem(button, text, missing = false) {
  if (missing) button.classList.add("sn-file-missing");
  button.dataset.title ??= button.title; // to put back once it opens
  button.title = text;
  let hint = button.nextSibling;
  if (hint?.className !== "sn-file-hint") {
    hint = document.createElement("span");
    hint.className = "sn-file-hint";
    hint.tabIndex = 0;
    hint.setAttribute("role", "img");
    hint.innerHTML = ICONS.warning; // hardcoded SVG constants, not user input
    const show = () => showTip(hint, hint.getAttribute("aria-label"));
    hint.addEventListener("mouseenter", show);
    hint.addEventListener("focus", show);
    hint.addEventListener("mouseleave", hideTip);
    hint.addEventListener("blur", hideTip);
    button.after(hint);
  }
  hint.setAttribute("aria-label", text);
}

// One tooltip, fixed on top of everything: the panel and the conversation clip
// their contents, so it can't live inside them.
let tip = null;
export function showTip(anchor, text) {
  tip ??= Object.assign(document.createElement("div"), { className: "sn-tip" });
  tip.textContent = text;
  uiRoot().append(tip);
  const a = anchor.getBoundingClientRect();
  const w = tip.offsetWidth;
  tip.style.left = `${Math.max(8, Math.min(a.left + a.width / 2 - w / 2, innerWidth - w - 8))}px`;
  tip.style.top = `${a.bottom + 6}px`;
}
export function hideTip() {
  tip?.remove();
}
