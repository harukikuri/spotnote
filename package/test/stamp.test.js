// Stamping through the plugin's own transform hook, as Vite calls it. Vue and
// Svelte use the compilers installed in examples/, as an app's would be.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import spotnote from "../src/index.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../../examples");

async function stamp(rel, code) {
  const plugin = spotnote();
  plugin.configResolved({ root, plugins: [] });
  await plugin.buildStart();
  return (await plugin.transform.handler(code, path.join(root, rel)))?.code;
}

test("JSX: host elements get file:line:column (1-based) and their component", async () => {
  const out = await stamp("src/Card.jsx", "function Card() {\n  return <div>\n    <span>hi</span>\n  </div>;\n}\n");
  assert.match(out, /<div data-spotnote="src\/Card\.jsx:2:10" data-spotnote-name="Card">/);
  assert.match(out, /<span data-spotnote="src\/Card\.jsx:3:5" data-spotnote-name="Card">/);
});

test("JSX: components and member tags aren't stamped", async () => {
  const out = await stamp("src/App.jsx", "const App = () => <><Card /><motion.div /></>;\n");
  assert.doesNotMatch(out, /data-spotnote/);
});

test("JSX: the owner is found through memo() and past callbacks", async () => {
  const out = await stamp("src/List.jsx", "const List = memo(() => items.map((i) => <li>{i}</li>));\n");
  assert.match(out, /<li data-spotnote="src\/List\.jsx:1:42" data-spotnote-name="List">/);
});

test("JSX: no owner outside a capitalized function, and no second stamp", async () => {
  const out = await stamp("src/x.jsx", 'const a = <b data-spotnote="kept" />;\nconst c = <i />;\n');
  assert.match(out, /<b data-spotnote="kept" \/>/);
  assert.match(out, /<i data-spotnote="src\/x\.jsx:2:11" \/>/);
});

test("JSX: files in node_modules are left alone", async () => {
  assert.equal(await stamp("node_modules/lib/x.jsx", "const a = <div />;\n"), undefined);
});

test("JSX: a file that can't be parsed is passed on unstamped", async (t) => {
  t.mock.method(console, "warn", () => {});
  assert.equal(await stamp("src/broken.jsx", "const a = <div>;\n"), undefined);
});

test("Vue: template elements get a stamp named after the file", async () => {
  const out = await stamp("src/Hello.vue", "<template>\n  <p>hi <MyComp /></p>\n</template>\n");
  assert.match(out, /<p data-spotnote="src\/Hello\.vue:2:3" data-spotnote-name="Hello">/);
  assert.doesNotMatch(out, /<MyComp data-spotnote/);
});

test("Svelte: markup elements are stamped, the script isn't", async () => {
  const out = await stamp("src/Hi.svelte", "<script>let n = '<b>';</script>\n<h1>{n}</h1>\n<Child />\n");
  assert.match(out, /<h1 data-spotnote="src\/Hi\.svelte:2:1" data-spotnote-name="Hi">/);
  assert.match(out, /let n = '<b>';/);
  assert.doesNotMatch(out, /<Child data-spotnote/);
});
