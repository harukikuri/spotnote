// JSX (.jsx, .tsx): a Babel pass of our own stamps `data-spotnote="file:line:column"`
// onto DOM elements (HTML, SVG and custom elements), before the framework's
// compiler sees the file. The same visitor works for any JSX (React, Solid,
// Preact): only the framework's own pass comes after it.
import path from "node:path";
import type { NodePath, PluginObj, PluginPass, types } from "@babel/core";
import { DOM_TAGS } from "./dom-tags.ts";
import type { Stamper, Use } from "./shared.ts";

// Derive a function's name: `function Foo(){}`, `const Foo = () =>`, or a wrapped
// `const Foo = memo(() => {})` / `forwardRef(...)`.
function fnName(fn: NodePath<types.Function>): string | null {
  if ("id" in fn.node && fn.node.id?.name) return fn.node.id.name;
  let p = fn.parentPath;
  while (p?.isCallExpression()) p = p.parentPath; // unwrap memo()/forwardRef()
  if (p?.isVariableDeclarator() && p.node.id.type === "Identifier") return p.node.id.name;
  return null;
}

// The nearest enclosing *capitalized* function = the component that owns this
// element. Walks up past anonymous callbacks (e.g. `.map(item => <li/>)`).
function ownerComponent(nodePath: NodePath): string | null {
  let fn = nodePath.getFunctionParent();
  while (fn) {
    const n = fnName(fn);
    if (n && /^[A-Z]/.test(n)) return n;
    fn = fn.getFunctionParent();
  }
  return null;
}

const babelVisitor = ({ types: t }: { types: typeof types }): PluginObj => ({
  name: "data-spotnote",
  visitor: {
    JSXOpeningElement(nodePath, state: PluginPass) {
      const name = nodePath.node.name;

      if (name.type !== "JSXIdentifier") return;
      const loc = nodePath.node.loc;
      const filename = state.filename;
      if (!loc || !filename) return;

      // A component (<Foo>) isn't stamped: it may not forward the attribute to
      // a real DOM node. Where it's used is kept instead (the plugin hands it to
      // the page), so a prompt can name the line that renders it.
      if (name.name[0] !== name.name[0].toLowerCase()) {
        const meta = state.file.metadata as typeof state.file.metadata & { spotnoteUses?: Use[] };
        meta.spotnoteUses ??= [];
        meta.spotnoteUses.push([name.name, loc.start.line, loc.start.column + 1]);
        return;
      }

      // Only DOM elements: another renderer's lowercase tag (React Three
      // Fiber's <mesh>) isn't one, and a stamp would break it.
      if (!DOM_TAGS.has(name.name) && !name.name.includes("-")) return;

      // Don't double-stamp.
      const already = nodePath.node.attributes.some(
        (a) => a.type === "JSXAttribute" && a.name.name === "data-spotnote",
      );
      if (already) return;

      // Absolute path -> project-relative POSIX path.
      const root = state.file.opts.root || process.cwd();
      const rel = path.relative(root, filename).replace(/\\/g, "/");

      // Babel's column is 0-based; stamps are 1-based like editors (line:col).
      const value = `${rel}:${loc.start.line}:${loc.start.column + 1}`;

      nodePath.node.attributes.push(t.jsxAttribute(t.jsxIdentifier("data-spotnote"), t.stringLiteral(value)));

      // Record the owning component so the client can show a name breadcrumb.
      const owner = ownerComponent(nodePath);
      if (owner) {
        nodePath.node.attributes.push(t.jsxAttribute(t.jsxIdentifier("data-spotnote-name"), t.stringLiteral(owner)));
      }
    },
  },
});

// Babel itself is loaded on the first .jsx or .tsx file.
let transformSync: typeof import("@babel/core").transformSync | undefined;

export const jsx: Stamper = {
  handles: (file) => /\.(jsx|tsx)$/.test(file),

  async stamp(code, file, { top }, used) {
    transformSync ??= (await import("@babel/core")).transformSync;
    const res = transformSync(code, {
      filename: file,
      root: top, // what stamped paths are relative to (see the visitor)
      plugins: [babelVisitor],
      // Parse permissively so common app syntax (decorators, import
      // attributes, `using`) doesn't trip our standalone pass.
      parserOpts: {
        plugins: ["jsx", "typescript", "decorators-legacy", "importAttributes", "explicitResourceManagement"],
      },
      configFile: false,
      babelrc: false,
      sourceMaps: true,
    });
    if (!res || res.code == null) return null;
    used.push(...((res.metadata as { spotnoteUses?: Use[] }).spotnoteUses ?? []));
    return { code: res.code, map: res.map ?? null };
  },
};
