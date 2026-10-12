// A small Markdown subset for the agent's messages in the note panel: paragraphs,
// line breaks, "-"/"1." lists, ``` code blocks, `code`, **bold**, and "#"
// headings (shown as a bold line). Built from DOM nodes and text only, never
// innerHTML, so whatever the agent writes can't run as markup.
//
// Code is syntax-coloured (tags, attributes, strings, keywords, numbers,
// comments), and markup the agent wrote without backticks (<span class="x">)
// is shown as code anyway. File references like `router.jsx:28` become links;
// `onFile(ref, button)` opens them.

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
      paint(el("pre", out), code.join("\n"));
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

// `code` and **bold**; in plain text, bare markup becomes code and file
// references become links. A `code` span that is just a file is a link too.
function inline(parent, text, onFile) {
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (let m; (m = re.exec(text)); ) {
    prose(parent, text.slice(last, m.index), onFile);
    last = re.lastIndex;
    if (m[1] != null) last += glued(parent, m[1].length <= 40, text.slice(last), (p) => code(p, m[1], onFile));
    else prose(el("strong", parent), m[2], onFile);
  }
  prose(parent, text.slice(last), onFile);
}

// A chip or a file link is a box of its own, so the browser may wrap between it
// and the "." or ")" right after it, leaving that alone on the next line. Keep
// them together: `make(p)` adds the box to `p`; returns how much of `after` it took.
const TRAILING = /^[.,;:!?)\]}"'’”]+/;
function glued(parent, short, after, make) {
  const tail = short ? (after.match(TRAILING)?.[0] ?? "") : ""; // a long chip may wrap inside: leave it be
  if (!tail) {
    make(parent);
    return 0;
  }
  const span = el("span", parent, "sn-glue");
  make(span);
  span.append(tail);
  return tail.length;
}

// Short code (up to 40 characters) stays on one line; longer code may wrap.
const chip = (parent, text) => el("code", parent, text.length <= 40 ? "sn-nowrap" : "");

function code(parent, text, onFile) {
  const c = chip(parent, text);
  if (new RegExp(`^${FILE_REF.source}$`).test(text)) files(c, text, onFile);
  else paint(c, text);
}

// Markup written without backticks: <span className="x">, </a>, <Link to="/" />.
const BARE_TAG = /<\/?[A-Za-z][\w.:-]*(?:\s+[^<>]*?)?\s*\/?>/g;
function prose(parent, text, onFile) {
  let last = 0;
  for (const m of text.matchAll(BARE_TAG)) {
    files(parent, text.slice(last, m.index), onFile);
    last = m.index + m[0].length;
    last += glued(parent, m[0].length <= 40, text.slice(last), (p) => paint(chip(p, m[0]), m[0]));
  }
  files(parent, text.slice(last), onFile);
}

// Syntax colour, for JSX/HTML, JS and CSS alike: one pass, a class per token.
const TOKENS = new RegExp(
  [
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/, // 1 comment
    /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/, // 2 string
    /(<\/?)([A-Za-z][\w.:-]*)/, // 3 bracket, 4 tag name
    /([A-Za-z_:@][\w:.-]*)(?=\s*=)/, // 5 attribute
    /\b(const|let|var|function|return|import|export|from|default|if|else|for|while|new|class|extends|async|await|true|false|null|undefined)\b/, // 6 keyword
    /(#[0-9a-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|ms|s|%)?\b)/, // 7 number
  ]
    .map((r) => r.source)
    .join("|"),
  "g",
);
const KIND = { 1: "com", 2: "str", 4: "tag", 5: "attr", 6: "kw", 7: "num" };
function paint(parent, text) {
  let last = 0;
  for (const m of text.matchAll(TOKENS)) {
    parent.append(text.slice(last, m.index));
    if (m[3] != null) parent.append(m[3]); // "<" or "</" stays plain
    const g = [1, 2, 4, 5, 6, 7].find((i) => m[i] != null);
    el("span", parent, `sn-tk-${KIND[g]}`).textContent = m[g];
    last = m.index + m[0].length;
  }
  parent.append(text.slice(last));
}

function files(parent, text, onFile) {
  let last = 0;
  for (const m of text.matchAll(FILE_REF)) {
    parent.append(text.slice(last, m.index));
    last = m.index + m[0].length;
    last += glued(parent, true, text.slice(last), (p) => {
      const a = el("button", p, "sn-file");
      a.type = "button";
      a.textContent = m[0];
      a.title = "Open in your editor";
      a.addEventListener("click", () => onFile({ path: m[1], line: m[2], column: m[3] }, a));
    });
  }
  parent.append(text.slice(last));
}
