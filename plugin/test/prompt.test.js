// The DOM-free parts of the prompt (src/client/prompt.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLoc, refKey, savedPrompt } from "../src/client/prompt.js";

test("parseLoc splits from the right, so a path may contain ':'", () => {
  assert.deepEqual(parseLoc("src/App.jsx:12:4"), { file: "src/App.jsx", line: 12, column: 4 });
  assert.deepEqual(parseLoc("C:/app/a.vue:3:9"), { file: "C:/app/a.vue", line: 3, column: 9 });
});

test("refKey is loc@index", () => {
  assert.equal(refKey("src/App.jsx:12:4", 2), "src/App.jsx:12:4@2");
});

test("savedPrompt flags the saved prompt as possibly stale", () => {
  const prompt = "## Request\nBigger\n\n## Target\n- file: a.jsx\n";
  const out = savedPrompt({ prompt, loc: "a.jsx:1:1", note: "Bigger" });
  assert.match(out, /^## Target\n- note: this location is from when the note was written/m);
  assert.match(out, /- file: a\.jsx/);
});

test("savedPrompt rebuilds the basics for a note saved without one", () => {
  const out = savedPrompt({ loc: "src/a.jsx:7:3", note: "Bigger" });
  assert.equal(
    out,
    [
      "## Request",
      "Bigger",
      "",
      "## Target",
      "- note: this location is from when the note was written; the code has changed since, so look near it",
      "- file: src/a.jsx",
      "- line: 7, column: 3",
    ].join("\n"),
  );
});
