// The parts of the prompt that read the page (src/client/prompt.ts), against a
// happy-dom document.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const window = new Window();
globalThis.document = window.document;
globalThis.getComputedStyle = (el) => window.getComputedStyle(el);
const { occInfo, resolveRef, buildPrompt, setCommit } = await import("../src/client/prompt.ts");

beforeEach(() => {
  document.body.innerHTML = `
    <main data-spotnote="App.jsx:3:5" data-spotnote-name="App">
      <section data-spotnote="pages/Products.jsx:10:7" data-spotnote-name="Products">
        <ul>
          <li data-spotnote="components/Card.jsx:4:9" data-spotnote-name="Card">First</li>
          <li data-spotnote="components/Card.jsx:4:9" data-spotnote-name="Card" id="pick" class="card active">
            Second   card <em>new</em>
          </li>
        </ul>
        <button data-spotnote="pages/Products.jsx:20:9" data-spotnote-name="Products"><svg><path /></svg></button>
      </section>
    </main>`;
});

const pick = () => document.getElementById("pick");

test("occInfo tells repeated elements apart by their order", () => {
  assert.deepEqual(occInfo(pick()), { loc: "components/Card.jsx:4:9", index: 1, total: 2 });
});

test("resolveRef finds the element again from loc and index", () => {
  assert.equal(resolveRef("components/Card.jsx:4:9", 1), pick());
  assert.equal(resolveRef("components/Card.jsx:4:9", 5), null);
});

test("buildPrompt: request, target, instance and source path", () => {
  const prompt = buildPrompt(pick(), "Make it pill-shaped");
  assert.match(prompt, /^## Request\nMake it pill-shaped\n\n## Target\n/);
  assert.match(prompt, /- file: components\/Card\.jsx\n- line: 4, column: 9\n/);
  assert.match(prompt, /- element: <li id="pick" class="card active">/);
  assert.match(prompt, /- text: "Second card new"/); // whitespace collapsed
  assert.match(prompt, /- instance: 2 of 2 rendered from this line/);
  assert.match(prompt, /## Source path \(outer → inner\)\nApp > Products > Card\n/);
  assert.match(prompt, /## Current computed styles\n {2}padding: /);
});

test("buildPrompt flags a click on an unstamped child", () => {
  const button = document.querySelector("button");
  const prompt = buildPrompt(button, "Bigger icon", button.querySelector("path"));
  assert.match(prompt, /- note: the clicked <path> has no source stamp/);
  assert.doesNotMatch(prompt, /- text: /); // no text in the button
  assert.doesNotMatch(prompt, /- instance: /); // only one from that line
});

test("buildPrompt leaves out the source path when one component owns it all", () => {
  document.body.innerHTML = '<p data-spotnote="App.jsx:1:1" data-spotnote-name="App">hi</p>';
  assert.doesNotMatch(buildPrompt(document.querySelector("p"), "x"), /## Source path/);
});

test("buildPrompt on several elements: one numbered target section each", () => {
  const button = document.querySelector("button");
  const prompt = buildPrompt([pick(), button], "Match these");
  assert.match(prompt, /^## Request\nMatch these\n\n## Target 1 of 2\n- file: components\/Card\.jsx\n/);
  assert.match(
    prompt,
    /\n\n## Target 2 of 2\n- file: pages\/Products\.jsx\n- line: 20, column: 9\n- rendered inside: App\.jsx:3:5 \(App\)\n- element: <button>/,
  );
  assert.equal(prompt.match(/## Current computed styles/g).length, 2);
});

test("buildPrompt names the line that uses a component here, from the uses the plugin lists", () => {
  globalThis.__spotnoteUses = {
    "pages/Products.jsx": [
      ["Card", 12, 11],
      ["Card", 30, 5],
      ["Header", 2, 1],
    ],
  };
  try {
    // The first <Card> after the owner's element (line 10) that contains it.
    assert.match(
      buildPrompt(pick(), "x"),
      /\n- line: 4, column: 9\n- used at: pages\/Products\.jsx:12 \(<Card> in Products\)\n/,
    );
  } finally {
    delete globalThis.__spotnoteUses;
  }
});

test("buildPrompt without the line that uses it: the nearest other owner's element", () => {
  assert.match(buildPrompt(pick(), "x"), /\n- rendered inside: pages\/Products\.jsx:10:7 \(Products\)\n/);
});

test("buildPrompt names the commit a deployed build is made from", () => {
  assert.doesNotMatch(buildPrompt(pick(), "x"), /commit/);
  setCommit("abc1234");
  try {
    assert.match(
      buildPrompt(pick(), "x"),
      /- line: 4, column: 9\n- commit: abc1234 \(.*git show abc1234:components\/Card\.jsx\)\n/,
    );
  } finally {
    setCommit(null);
  }
});

test("buildPrompt breaks the text between blocks, and names an instance by its text only when it has one", () => {
  document.body.innerHTML = `
    <div data-spotnote="Card.jsx:4:5" class="card"><h3>Aero Runner</h3><p>$120</p></div>
    <div data-spotnote="Card.jsx:4:5" class="card"><h3>Trail Pack</h3><p>$89</p></div>
    <hr data-spotnote="List.jsx:9:7" /><hr data-spotnote="List.jsx:9:7" />`;
  const card = buildPrompt(document.querySelector(".card"), "x");
  assert.match(card, /- text: "Aero Runner \$120"/);
  assert.match(
    card,
    /- instance: 1 of 2 rendered from this line \(by DOM order\) — target the one matching the text above/,
  );
  const rule = buildPrompt(document.querySelectorAll("hr")[1], "x");
  assert.doesNotMatch(rule, /- text: /);
  assert.match(rule, /- instance: 2 of 2 rendered from this line \(by DOM order\)\n/);
});
