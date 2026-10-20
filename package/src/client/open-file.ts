// File links (the panel's file:line, files the agent mentions) → your editor,
// and the warning shown next to a link that didn't open.
import { uiRoot } from "./ui.ts";
import { ICONS } from "./icons.ts";
import { getSettings, EDITORS } from "./settings.ts";
import { parseLoc } from "./prompt.ts";

// A file to open: its path, and the line and column when known.
export interface FileRef {
  path: string;
  line?: string;
  column?: string;
}

// A file the agent mentioned → open it in your editor: the one picked in
// Settings (through its URL), or with "Auto" the one running (the dev server
// launches it). A bare name ("router.jsx") is looked up among the page's stamps
// first; the dev server then finds it on disk (see /__spotnote/open).
export async function openFile({ path, line, column }: FileRef, button: HTMLElement): Promise<void> {
  if (!path.includes("/")) {
    const known = new Set(
      [...document.querySelectorAll("[data-spotnote]")].map(
        (e) => parseLoc(e.getAttribute("data-spotnote") ?? "").file,
      ),
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
  const body: { file?: string; scheme?: string } | null = res && (await res.json().catch(() => null));
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
function clearFileProblem(button: HTMLElement) {
  button.classList.remove("sn-file-missing");
  if (button.dataset.title != null) button.title = button.dataset.title;
  const hint = button.nextElementSibling;
  if (hint?.className === "sn-file-hint") hint.remove();
  hideTip();
}
// Say why a file link didn't open: a warning icon right after it, with the
// reason on hover (or focus).
function fileProblem(button: HTMLElement, text: string, missing = false) {
  if (missing) button.classList.add("sn-file-missing");
  button.dataset.title ??= button.title; // to put back once it opens
  button.title = text;
  let hint = button.nextElementSibling as HTMLElement | null;
  if (hint?.className !== "sn-file-hint") {
    const made = document.createElement("span");
    hint = made;
    made.className = "sn-file-hint";
    made.tabIndex = 0;
    made.setAttribute("role", "img");
    made.innerHTML = ICONS.warning; // hardcoded SVG constants, not user input
    const show = () => showTip(made, made.getAttribute("aria-label") ?? "");
    made.addEventListener("mouseenter", show);
    made.addEventListener("focus", show);
    made.addEventListener("mouseleave", hideTip);
    made.addEventListener("blur", hideTip);
    button.after(made);
  }
  hint.setAttribute("aria-label", text);
}

// One tooltip, fixed on top of everything: the panel and the conversation clip
// their contents, so it can't live inside them.
let tip: HTMLDivElement | null = null;
export function showTip(anchor: Element, text: string): void {
  const t = (tip ??= Object.assign(document.createElement("div"), { className: "sn-tip" }));
  t.textContent = text;
  uiRoot().append(t);
  const a = anchor.getBoundingClientRect();
  const w = t.offsetWidth;
  t.style.left = `${Math.max(8, Math.min(a.left + a.width / 2 - w / 2, innerWidth - w - 8))}px`;
  t.style.top = `${a.bottom + 6}px`;
}
export function hideTip(): void {
  tip?.remove();
}
