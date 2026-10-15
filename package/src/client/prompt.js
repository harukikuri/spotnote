// Where an element is written, and the prompt that hands it to an agent. Reads
// only the data-spotnote stamps already in the DOM, so it's framework-agnostic.

// "src/App.jsx:12:4" -> {file, line, column}  (split from the RIGHT: path may contain ':')
export function parseLoc(s) {
  const i = s.lastIndexOf(":");
  const j = s.lastIndexOf(":", i - 1);
  return { file: s.slice(0, j), line: Number(s.slice(j + 1, i)), column: Number(s.slice(i + 1)) };
}

// Identity for a picked element: data-spotnote + occurrence index among same-loc
// siblings, so identical .map() items (e.g. <li>) can be told apart.
export function occInfo(el) {
  const loc = el.getAttribute("data-spotnote");
  const same = [...document.querySelectorAll(`[data-spotnote="${loc}"]`)];
  const index = same.indexOf(el);
  return { loc, index: index < 0 ? 0 : index, total: same.length };
}
export function refKey(loc, index) {
  return `${loc}@${index}`;
}
export function resolveRef(loc, index) {
  return document.querySelectorAll(`[data-spotnote="${loc}"]`)[index] || null;
}

// A ready-to-paste prompt: request first, then precise target + context, in a
// labeled/structured layout that's easy for a coding agent to act on.
// Walk up the DOM from `el`, collecting the distinct owning components off the
// data-spotnote stamps (outer → inner) — e.g. App > Products > ProductCard.
// Uses the stamped component name when present, else the file's basename. Only
// reads stamps already in the DOM, so it stays framework-agnostic.
function sourcePath(el) {
  const up = []; // inner → outer
  for (let node = el; node; node = node.parentElement) {
    if (node.hasAttribute("data-spotnote-ui")) continue; // skip our own overlay
    const loc = node.getAttribute("data-spotnote");
    if (!loc) continue;
    const label =
      node.getAttribute("data-spotnote-name") ||
      parseLoc(loc)
        .file.split("/")
        .pop()
        .replace(/\.\w+$/, "");
    if (up[up.length - 1] !== label) up.push(label); // dedupe consecutive same component
  }
  return up.reverse(); // outer → inner
}

export function buildPrompt(el, note, raw = null) {
  const l = parseLoc(el.getAttribute("data-spotnote"));
  const occ = occInfo(el);
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === "string" && el.className.trim() ? ` class="${el.className.trim()}"` : "";
  const id = el.id ? ` id="${el.id}"` : "";
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const cs = getComputedStyle(el);
  const round = (v) => v.replace(/(\d+\.\d{2})\d+/g, "$1"); // trim fractional px
  const styles = [
    ["padding", "padding"],
    ["margin", "margin"],
    ["color", "color"],
    ["background", "background-color"],
    ["font-size", "font-size"],
    ["font-weight", "font-weight"],
    ["border-radius", "border-radius"],
  ]
    .map(([label, prop]) => `  ${label}: ${round(cs.getPropertyValue(prop))}`)
    .join("\n");

  // If the actual click (`raw`) landed on a deeper element with no stamp, flag
  // it — it's likely from a dependency or injected HTML, and `el` is the nearest
  // stamped ancestor (not the exact clicked node).
  const rawUnstamped = raw && raw !== el && el.contains(raw);

  const path = sourcePath(el); // outer → inner

  return [
    `## Request`,
    note,
    "",
    `## Target`,
    `- file: ${l.file}`,
    `- line: ${l.line}, column: ${l.column}`,
    `- element: <${tag}${id}${cls}>`,
    text ? `- text: "${text}"` : null,
    occ.total > 1
      ? `- instance: ${occ.index + 1} of ${occ.total} rendered from this line (by DOM order) — target the one matching the text above`
      : null,
    rawUnstamped
      ? `- note: the clicked <${raw.tagName.toLowerCase()}> has no source stamp (likely from a dependency or injected HTML); this is the nearest stamped ancestor`
      : null,
    path.length > 1 ? "" : null,
    path.length > 1 ? `## Source path (outer → inner)` : null,
    path.length > 1 ? path.join(" > ") : null,
    "",
    `## Current computed styles`,
    styles,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

// The prompt for a note whose element can't be found: the one saved when it was
// written, flagged as possibly stale (older notes have none — rebuild the basics).
export function savedPrompt(pin) {
  const stale = "- note: this location is from when the note was written; the code has changed since, so look near it";
  if (pin.prompt) return pin.prompt.replace("## Target\n", `## Target\n${stale}\n`);
  const l = parseLoc(pin.loc);
  return [
    "## Request",
    pin.note,
    "",
    "## Target",
    stale,
    `- file: ${l.file}`,
    `- line: ${l.line}, column: ${l.column}`,
  ].join("\n");
}
