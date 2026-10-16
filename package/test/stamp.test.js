// Stamping through the plugin's own transform hook, as Vite calls it. Vue,
// Svelte and Astro use the compilers installed in each example app, as an app's
// would be: every version the end-to-end tests run on.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import spotnote from "../src/index.js";

const examples = path.resolve(fileURLToPath(import.meta.url), "../../../examples");
const root = path.join(examples, "react/react19");

async function stamp(rel, code, appRoot = root) {
  const [plugin] = spotnote();
  plugin.configResolved({ root: appRoot, plugins: [] });
  await plugin.buildStart();
  return (await plugin.transform.handler(code, path.join(appRoot, rel)))?.code;
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

for (const app of ["vue32", "vue34", "vue35"]) {
  test(`Vue (${app}): template elements get a stamp named after the file`, async () => {
    const out = await stamp(
      "src/Hello.vue",
      "<template>\n  <p>hi <MyComp /></p>\n</template>\n",
      path.join(examples, "vue", app),
    );
    assert.match(out, /<p data-spotnote="src\/Hello\.vue:2:3" data-spotnote-name="Hello">/);
    assert.doesNotMatch(out, /<MyComp data-spotnote/);
  });
}

for (const app of ["svelte4", "svelte5"]) {
  const svelte = (rel, code) => stamp(rel, code, path.join(examples, "svelte", app));

  test(`Svelte (${app}): markup elements are stamped, the script isn't`, async () => {
    const out = await svelte("src/Hi.svelte", "<script>let n = '<b>';</script>\n<h1>{n}</h1>\n<Child />\n");
    assert.match(out, /<h1 data-spotnote="src\/Hi\.svelte:2:1" data-spotnote-name="Hi">/);
    assert.match(out, /let n = '<b>';/);
    assert.doesNotMatch(out, /<Child data-spotnote/);
  });

  test(`Svelte (${app}): a file that can't be parsed is left to the Svelte plugin`, async () => {
    assert.equal(await svelte("src/Broken.svelte", "<h1>{n</h1>\n"), undefined);
  });
}

// Astro 7 (@astrojs/compiler-rs) and Astro 5 and 6 (@astrojs/compiler) give different ASTs.
for (const [app, version] of [
  ["astro7", "Astro 7"],
  ["astro6", "Astro 6"],
  ["astro5", "Astro 5"],
]) {
  const astro = (rel, code) => stamp(rel, code, path.join(examples, "astro", app));

  test(`${version}: markup elements are stamped, components, <script>, <style> and <slot> aren't`, async () => {
    const out = await astro(
      "src/Hi.astro",
      '---\nconst t = "日本語";\n---\n<p>日本語</p><h1>{t}</h1>\n<Child />\n<ul>{[1].map(() => <li>x</li>)}</ul>\n<slot />\n<script>let n = 1;</script>\n<style>h1 {}</style>\n',
    );
    assert.match(out, /<h1 data-spotnote="src\/Hi\.astro:4:11" data-spotnote-name="Hi">/); // after multibyte text
    assert.match(out, /<li data-spotnote="src\/Hi\.astro:6:20" data-spotnote-name="Hi">/);
    assert.doesNotMatch(out, /<(Child|slot|script|style) data-spotnote/);
  });

  test(`${version}: every file brings the picker in a script, below its own lines`, async () => {
    const out = await astro("src/Hi.astro", "<p>hi</p>\n");
    assert.equal(out.split("\n")[0], '<p data-spotnote="src/Hi.astro:1:1" data-spotnote-name="Hi">hi</p>');
    assert.match(out, /<script>import "virtual:spotnote-client";<\/script>\n$/);
  });

  test(`${version}: a whole page is stamped`, async () => {
    const out = await astro("src/pages/index.astro", "<html>\n  <body><p>hi</p></body>\n</html>\n");
    assert.match(out, /<p data-spotnote="src\/pages\/index\.astro:2:9" data-spotnote-name="index">/);
  });
}
