// The agent's messages in the note panel (src/client/markdown.ts), against a
// happy-dom document.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const window = new Window();
globalThis.document = window.document;
const { renderMarkdown } = await import("../src/client/markdown.ts");

const box = (text, onFile = () => {}) => {
  const div = document.createElement("div");
  div.append(renderMarkdown(text, onFile));
  return div;
};
const html = (text) => box(text).innerHTML;

test("what the agent writes never runs as markup", () => {
  const div = box('<img src=x onerror="alert(1)"> and <script>alert(2)</script>\n\n**<b>hi</b>**');
  assert.equal(div.querySelector("img, script, b"), null);
  assert.match(div.textContent, /<img src=x onerror="alert\(1\)">/);
  assert.equal(div.querySelectorAll("code").length, 5); // each bare tag shown as code
  assert.equal(box("`a &amp; b`").textContent, "a &amp; b"); // text, not HTML
  assert.equal(box("```\n&lt;i&gt;\n```").textContent, "&lt;i&gt;");
});

test("paragraphs, line breaks and headings", () => {
  assert.equal(html("One\ntwo\r\n\nThree"), "<p>One<br>two</p><p>Three</p>");
  assert.equal(html("## Done"), '<p class="sn-md-h">Done</p>');
});

test("lists: '-' and '*' bullets, numbered, and a switch between them", () => {
  assert.equal(html("- a\n* b"), "<ul><li>a</li><li>b</li></ul>");
  assert.equal(html("1. a\n2) b\n- c"), "<ol><li>a</li><li>b</li></ol><ul><li>c</li></ul>");
  assert.equal(html("Intro\n- a"), "<p>Intro</p><ul><li>a</li></ul>");
});

test("**bold** and `code`; short code stays on one line", () => {
  assert.equal(html("**big** `x`"), '<p><strong>big</strong> <code class="sn-nowrap">x</code></p>');
  assert.equal(box("`" + "x".repeat(41) + "`").querySelector("code").className, "");
});

test("code blocks are coloured by token, up to the closing fence or the end", () => {
  const div = box('```jsx\n// note\n<Button size="lg" n={2}>\nconst a = "b";\nok = a== b;\n```\nafter');
  const pre = div.querySelector("pre");
  const kinds = [...pre.querySelectorAll("span")].map((s) => `${s.className.slice(6)}:${s.textContent}`);
  assert.deepEqual(kinds, [
    "com:// note",
    "tag:Button",
    "attr:size",
    'str:"lg"',
    "attr:n",
    "num:2",
    "kw:const",
    'str:"b"',
  ]); // JS assignments and comparisons aren't attributes
  assert.equal(pre.textContent, '// note\n<Button size="lg" n={2}>\nconst a = "b";\nok = a== b;');
  assert.equal(div.querySelector("p").textContent, "after");
  assert.equal(box("```\nopen").querySelector("pre").textContent, "open");
});

test("file references become buttons that open the file", () => {
  const opened = [];
  const div = box("See src/App.jsx:28:5 and `router.ts:3`, not v1.2 or a/b.", (ref) => opened.push(ref));
  const buttons = [...div.querySelectorAll("button.sn-file")];
  assert.deepEqual(
    buttons.map((b) => b.textContent),
    ["src/App.jsx:28:5", "router.ts:3"],
  );
  buttons.forEach((b) => b.click());
  assert.deepEqual(opened, [
    { path: "src/App.jsx", line: "28", column: "5" },
    { path: "router.ts", line: "3", column: undefined },
  ]);
});

test("a chip keeps the punctuation right after it on its line", () => {
  assert.equal(
    html("Open App.jsx."),
    '<p>Open <span class="sn-glue"><button class="sn-file" type="button" title="Open in your editor">App.jsx</button>.</span></p>',
  );
  assert.equal(html("(`x`)"), '<p>(<span class="sn-glue"><code class="sn-nowrap">x</code>)</span></p>');
});
