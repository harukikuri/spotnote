// A small Markdown subset for the agent's messages in the note panel: paragraphs,
// line breaks, "-"/"1." lists, ``` code blocks, `code`, **bold**, and "#"
// headings (shown as a bold line). Built from DOM nodes and text only, never
// innerHTML, so whatever the agent writes can't run as markup.
//
// File references like `router.jsx:28` become links; `onFile(ref, button)` opens them.

const FILE_REF = /(?<![\w/.-])((?:[\w.@-]+\/)*[\w.@-]+\.(?:jsx|tsx|js|ts|mjs|cjs|vue|svelte|css|scss|sass|less|html|json|md))(?::(\d+))?(?::(\d+))?(?![\w/])/g;

export function renderMarkdown(text, onFile) {
  const out = document.createDocumentFragment();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.trimStart().startsWith("```")) {
      const code = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith("```"); i++) code.push(lines[i]);
      i++; // the closing fence
      const pre = el("pre", out);
      pre.textContent = code.join("\n");
    } else if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const list = el(ordered ? "ol" : "ul", out);
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i]) && /^\s*\d/.test(lines[i]) === ordered) {
        inline(el("li", list), lines[i].replace(/^\s*([-*]|\d+[.)])\s+/, ""), onFile);
        i++;
      }
    } else if (/^#{1,6}\s/.test(line)) {
      inline(el("p", out, "sn-md-h"), line.replace(/^#+\s+/, ""), onFile);
      i++;
    } else {
      // A paragraph: lines up to a blank line or the start of another block.
      const p = el("p", out);
      let first = true;
      while (i < lines.length && lines[i].trim() && !/^\s*(```|([-*]|\d+[.)])\s+|#{1,6}\s)/.test(lines[i])) {
        if (!first) p.append(document.createElement("br"));
        inline(p, lines[i], onFile);
        first = false;
        i++;
      }
    }
  }
  return out;
}

function el(tag, parent, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent.append(e);
  return e;
}

// `code` and **bold**, with file references linked (also inside `code`).
function inline(parent, text, onFile) {
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (let m; (m = re.exec(text)); ) {
    files(parent, text.slice(last, m.index), onFile);
    if (m[1] != null) files(el("code", parent), m[1], onFile);
    else files(el("strong", parent), m[2], onFile);
    last = re.lastIndex;
  }
  files(parent, text.slice(last), onFile);
}

function files(parent, text, onFile) {
  let last = 0;
  for (const m of text.matchAll(FILE_REF)) {
    parent.append(text.slice(last, m.index));
    const a = el("button", parent, "sn-file");
    a.type = "button";
    a.textContent = m[0];
    a.title = "Open in your editor";
    a.addEventListener("click", () => onFile({ path: m[1], line: m[2], column: m[3] }, a));
    last = m.index + m[0].length;
  }
  parent.append(text.slice(last));
}
