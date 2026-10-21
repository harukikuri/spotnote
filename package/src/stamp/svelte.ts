// Svelte, like Vue, isn't JSX — parse with the app's own `svelte/compiler` and
// splice `data-spotnote` onto native markup elements.
import path from "node:path";
import MagicString from "magic-string";
import { appImport, offsetToLineCol, perRoot, relPath, stampAttrs, walkAst, type Stamper } from "./shared.ts";

type SvelteNode = { type: string; name?: string; start?: number; attributes?: ({ name?: string } | null)[] };
type SvelteParse = (
  code: string,
  options: { filename: string; modern: boolean },
) => { fragment?: unknown; html?: unknown };
const getParse = perRoot(async (root) => {
  const m = await appImport(root, "svelte/compiler");
  // svelte/compiler is CJS — importing the file by path exposes `parse` on the
  // interop default, not as a named export.
  return (m.parse || (m.default as { parse?: unknown } | undefined)?.parse || null) as SvelteParse | null;
});

export const svelte: Stamper = {
  // Raw .svelte import only — skip the ?svelte&type= sub-requests.
  handles: (file, id) => file.endsWith(".svelte") && !id.includes("?"),

  async stamp(code, file, { root, top }, used) {
    const parse = await getParse(root);
    if (!parse) return null;
    // Svelte 4 reads <script> as JavaScript and <style> as CSS, so TypeScript or
    // SCSS there makes it throw. Only the markup is walked: parse a copy with
    // their contents blanked (same length and lines), and splice into the code.
    const markupOnly = code.replace(
      /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/g,
      (_, open, _tag, body, close) => open + body.replace(/[^\n]/g, " ") + close,
    );
    const ast = parse(markupOnly, { filename: file, modern: true });
    // Braces in an attribute value are an expression in Svelte: write them as
    // character references, so a path like src/{x}/ stays text.
    const text = (v: string) => v.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
    const rel = text(relPath(top, file));
    const name = text(path.basename(file, path.extname(file)));
    const s = new MagicString(code);
    let touched = false;
    // The markup root: `fragment` in Svelte 5's modern AST, `html` in Svelte 4's
    // (which ignores `modern`). Walking only it skips the <script>/<style> ASTs.
    // A native DOM tag is a RegularElement in Svelte 5 and an Element in Svelte 4;
    // components and <svelte:*> are other node types (in Svelte 4, <svelte:element>
    // is an Element named "svelte:element") → skipped.
    const markup = ast.fragment ?? ast.html;
    const isTag = ast.fragment
      ? (n: SvelteNode) => n.type === "RegularElement"
      : (n: SvelteNode) => n.type === "Element" && !n.name?.includes(":");
    walkAst<SvelteNode>(markup, (node) => {
      if (
        (node.type === "Component" || node.type === "InlineComponent") &&
        node.name &&
        typeof node.start === "number"
      ) {
        const { line, column } = offsetToLineCol(code, node.start);
        used.push([node.name, line, column]); // where a component is used (see jsx.ts)
      }
      if (!node.name || !isTag(node)) return;
      if (typeof node.start !== "number") return;
      const already = (node.attributes || []).some((a) => a && a.name === "data-spotnote");
      if (already) return;
      const { line, column } = offsetToLineCol(code, node.start);
      s.appendLeft(node.start + 1 + node.name.length, stampAttrs(rel, line, column, name));
      touched = true;
    });
    if (!touched) return;
    return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
  },
};
