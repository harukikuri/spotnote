// Astro, too: parse with the compiler of the app's own `astro` (the app may not
// depend on it directly) and splice `data-spotnote` onto native elements in the
// markup. Astro 7 has `@astrojs/compiler-rs`, Astro 5 and 6 `@astrojs/compiler`:
// each gives its own AST, so each gets a reader that lists the elements as
// { tag, start, stamped } (start: the offset of its "<" in the code).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import MagicString from "magic-string";
import { offsetToLineCol, perRoot, relPath, stampAttrs, usesScript, VIRTUAL, walkAst, type Stamper } from "./shared.ts";

const require = createRequire(import.meta.url);

type AstroElement = { tag: string; start: number; stamped: boolean };
type ElementsOf = (code: string) => Promise<AstroElement[]>;
const getElementsOf = perRoot(async (root): Promise<ElementsOf> => {
  const astroPkg = createRequire(path.join(root, "index.js")).resolve("astro/package.json");
  const astroRequire = createRequire(astroPkg);
  const load = async (pkg: string): Promise<unknown> =>
    (await import(pathToFileURL(astroRequire.resolve(pkg)).href)).parse;
  // The compiler this Astro declares: another one may be installed next to it.
  const astro: { dependencies?: Record<string, string> } = require(astroPkg);
  if (astro.dependencies?.["@astrojs/compiler-rs"]) {
    const parse = (await load("@astrojs/compiler-rs")) as (code: string) => { ast: unknown };
    return async (code) => rsElements(parse(code).ast);
  }
  const parse = (await load("@astrojs/compiler")) as (
    code: string,
    options: { position: boolean },
  ) => Promise<{ ast: unknown }>;
  return async (code) => goElements(code, (await parse(code, { position: true })).ast);
});

// Astro 7: elements are JSXElements (in the markup and inside {expressions}
// alike), with UTF-16 offsets, like JavaScript strings.
type RsNode = {
  type: string;
  start: number;
  name?: { type: string; name: string };
  attributes: { name?: { name?: string } }[];
};
function rsElements(ast: unknown): AstroElement[] {
  const found: AstroElement[] = [];
  walkAst<RsNode>((ast as { body?: unknown } | null)?.body, (node) => {
    if (node.type !== "JSXOpeningElement" || node.name?.type !== "JSXIdentifier") return;
    const stamped = node.attributes.some((a) => a.name?.name === "data-spotnote");
    found.push({ tag: node.name.name, start: node.start, stamped });
  });
  return found;
}

// Astro 5 and 6: native tags are "element" or "custom-element" nodes (components
// are "component"). Their offsets count UTF-8 bytes, so the start comes from the
// line and column, which count characters. <html> comes without a position: it
// isn't stamped.
type GoNode = {
  type: string;
  name: string;
  position?: { start: { line: number; column: number } };
  attributes: { name: string }[];
};
function goElements(code: string, ast: unknown): AstroElement[] {
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
  const found: AstroElement[] = [];
  walkAst<GoNode>(ast, (node) => {
    if (!["element", "custom-element", "component"].includes(node.type) || !node.position) return;
    const { line, column } = node.position.start;
    const stamped = node.attributes.some((a) => a.name === "data-spotnote");
    found.push({ tag: node.name, start: lineStarts[line - 1] + column - 1, stamped });
  });
  return found;
}

// Not stamped: <script> and <style>, which Astro would stop bundling once they
// have an attribute, and <slot>, which isn't an element in the page.
const ASTRO_SKIP = new Set(["script", "style", "slot"]);

export const astro: Stamper = {
  // Raw .astro import only — skip the ?astro&type= sub-requests.
  handles: (file, id) => file.endsWith(".astro") && !id.includes("?"),

  async stamp(code, file, { root, top }, used) {
    const elementsOf = await getElementsOf(root);
    if (!elementsOf) return null;
    const elements = await elementsOf(code);
    const rel = relPath(top, file);
    const name = path.basename(file, path.extname(file));
    const s = new MagicString(code);
    // A native tag is lowercase; components are capitalized or member names (<Foo.Bar>).
    for (const { tag, start, stamped } of elements) {
      const { line, column } = offsetToLineCol(code, start);
      if (tag[0] !== tag[0].toLowerCase()) used.push([tag, line, column]); // where a component is used
      if (stamped || tag[0] !== tag[0].toLowerCase() || ASTRO_SKIP.has(tag)) continue;
      s.appendLeft(start + 1 + tag.length, stampAttrs(rel, line, column, name));
    }
    // Astro pages send no other JavaScript to the browser unless they hydrate a
    // component, so each .astro file brings the picker in a script of its own
    // (Astro bundles it, and loads it once per page). At the end: no line moves.
    s.append(`\n<script>import "${VIRTUAL}";${usesScript(rel, used)}</script>\n`);
    return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
  },
};
