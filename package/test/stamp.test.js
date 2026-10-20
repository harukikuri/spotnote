// Stamping through the plugin's own transform hook, as Vite calls it. Vue,
// Svelte and Astro use the compilers installed in each example app, as an app's
// would be: every version the end-to-end tests run on.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import spotnote from "../src/index.ts";

const repo = path.resolve(fileURLToPath(import.meta.url), "../../..");
const examples = path.join(repo, "examples");
const root = path.join(examples, "react/react19");

// Stamped paths start at the repository's root (examples/react/react19/src/…):
// the tests below leave out the app's part, which the first one checks.
async function stamp(rel, code, appRoot = root, keepApp = false) {
  const [plugin] = spotnote();
  plugin.configResolved({ root: appRoot, plugins: [] });
  await plugin.buildStart();
  const out = (await plugin.transform.handler(code, path.join(appRoot, rel)))?.code;
  return keepApp ? out : out?.replaceAll(`${path.relative(repo, appRoot)}/`, "");
}

test("paths start at the repository's root, where agents work", async () => {
  const out = await stamp("src/Card.jsx", "const Card = () => <div />;\n", root, true);
  assert.match(out, /<div data-spotnote="examples\/react\/react19\/src\/Card\.jsx:1:20"/);
});

// Where components are used in a file, as the browser's copy of it hands them
// to the page (after the framework compiler).
async function uses(rel, code, appRoot = root) {
  const [main, client] = spotnote();
  main.configResolved({ root: appRoot, plugins: [] });
  await main.buildStart();
  const id = path.join(appRoot, rel);
  await main.transform.handler(code, id);
  const out = client.transform("", id, {})?.code ?? "";
  assert.match(out, new RegExp(`\\["${path.relative(repo, id)}"\\]`)); // keyed by its path from the repository's root
  return JSON.parse(out.match(/\] = (.*);$/m)?.[1] ?? "null");
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

test("JSX: only HTML, SVG and custom elements are stamped, not other renderers' tags", async () => {
  const out = await stamp(
    "src/Scene.jsx",
    "const Scene = () => <div>\n  <svg><linearGradient /></svg>\n  <my-el />\n  <mesh><boxGeometry /></mesh>\n</div>;\n",
  );
  assert.match(out, /<div data-spotnote="src\/Scene\.jsx:1:21"/);
  assert.match(out, /<svg data-spotnote=/);
  assert.match(out, /<linearGradient data-spotnote=/);
  assert.match(out, /<my-el data-spotnote=/);
  // React Three Fiber's three.js objects: a stamp would break them (issue #2).
  assert.match(out, /<mesh><boxGeometry \/><\/mesh>/);
});

test("exclude: matching files, from the Vite root, are left unstamped", async () => {
  const [main, client] = spotnote({ exclude: ["src/scene/**", /Legacy\.vue$/] });
  main.configResolved({ root, plugins: [] });
  await main.buildStart();
  const run = async (rel, code) => {
    const id = path.join(root, rel);
    const out = await main.transform.handler(code, id);
    return { out: out?.code, client: client.transform("", id, {})?.code ?? "" };
  };
  const scene = await run("src/scene/Box.jsx", "const Box = () => <line><Inner /></line>;\n");
  assert.equal(scene.out, undefined);
  assert.doesNotMatch(scene.client, /__spotnoteUses/); // nor its components' uses
  assert.equal((await run("src/Legacy.vue", "<template><p>hi</p></template>\n")).out, undefined);
  assert.match((await run("src/App.jsx", "const App = () => <div />;\n")).out, /data-spotnote=/);
});

test("JSX: where each component is used goes to the page", async () => {
  assert.deepEqual(await uses("src/App.jsx", "const App = () => <div>\n  <Card />\n</div>;\n"), [["Card", 2, 3]]);
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

for (const app of ["vue3_2", "vue3_4", "vue3_5"]) {
  test(`Vue (${app}): template elements get a stamp named after the file`, async () => {
    const out = await stamp(
      "src/Hello.vue",
      "<template>\n  <p>hi <MyComp /></p>\n</template>\n",
      path.join(examples, "vue", app),
    );
    assert.match(out, /<p data-spotnote="src\/Hello\.vue:2:3" data-spotnote-name="Hello">/);
    assert.doesNotMatch(out, /<MyComp data-spotnote/);
    const used = await uses(
      "src/Hello.vue",
      "<template>\n  <p>hi <MyComp /></p>\n</template>\n",
      path.join(examples, "vue", app),
    );
    assert.deepEqual(used, [["MyComp", 2, 9]]);
  });

  test(`Vue (${app}): a file that can't be parsed is skipped, with a warning`, async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    assert.equal(
      await stamp("src/Broken.vue", "<template><div></template>\n", path.join(examples, "vue", app)),
      undefined,
    );
    assert.match(warn.mock.calls[0].arguments[0], /\[spotnote\] skipped src\/Broken\.vue/);
  });
}

for (const app of ["svelte4", "svelte5"]) {
  const svelte = (rel, code) => stamp(rel, code, path.join(examples, "svelte", app));

  test(`Svelte (${app}): markup elements are stamped, the script isn't`, async () => {
    const out = await svelte("src/Hi.svelte", "<script>let n = '<b>';</script>\n<h1>{n}</h1>\n<Child />\n");
    assert.match(out, /<h1 data-spotnote="src\/Hi\.svelte:2:1" data-spotnote-name="Hi">/);
    assert.match(out, /let n = '<b>';/);
    assert.doesNotMatch(out, /<Child data-spotnote/);
    const used = await uses("src/Hi.svelte", "<h1>hi</h1>\n<Child />\n", path.join(examples, "svelte", app));
    assert.deepEqual(used, [["Child", 2, 1]]);
  });

  test(`Svelte (${app}): a file that can't be parsed is skipped, with a warning`, async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    assert.equal(await svelte("src/Broken.svelte", "<h1>{n</h1>\n"), undefined);
    assert.match(warn.mock.calls[0].arguments[0], /\[spotnote\] skipped src\/Broken\.svelte/);
  });

  test(`Svelte (${app}): TypeScript and SCSS in <script> and <style> don't stop the stamping`, async () => {
    const code =
      '<script lang="ts">let n: number = 1;</script>\n<h1>{n}</h1>\n<style lang="scss">h1 { &:hover { color: red; } }</style>\n';
    const out = await svelte("src/Ts.svelte", code);
    assert.match(out, /<h1 data-spotnote="src\/Ts\.svelte:2:1" data-spotnote-name="Ts">/);
    assert.match(out, /let n: number = 1;/); // the script itself is left as it was
  });

  test(`Svelte (${app}): braces in the path stay text, not an expression`, async () => {
    const out = await svelte("src/{x}/B.svelte", "<h1>hi</h1>\n");
    const { compile } = createRequire(path.join(examples, "svelte", app, "index.js"))("svelte/compiler");
    assert.match(compile(out, { filename: "B.svelte" }).js.code, /src\/\{x\}\/B\.svelte:1:1/);
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
    assert.match(out, /<script>import "virtual:spotnote-client";\n.*\["src\/Hi\.astro"\] = \[\];<\/script>\n$/);
    const used = await astro("src/Hi.astro", "<p>hi</p>\n<Child />\n");
    assert.match(used, /\["src\/Hi\.astro"\] = \[\["Child",2,1\]\];<\/script>\n$/); // where components are used
  });

  test(`${version}: a whole page is stamped`, async () => {
    const out = await astro("src/pages/index.astro", "<html>\n  <body><p>hi</p></body>\n</html>\n");
    assert.match(out, /<p data-spotnote="src\/pages\/index\.astro:2:9" data-spotnote-name="index">/);
  });
}
