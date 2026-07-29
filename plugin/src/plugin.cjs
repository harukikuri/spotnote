// Babel plugin: stamp `data-spotnote="file:line:column"` onto host (lowercase) JSX
// elements at compile time. Framework of record is React here, but the exact
// same visitor works for any JSX (Solid, Preact, Next) — only the registration
// point differs.
const path = require("path");

// Derive a function's name: `function Foo(){}`, `const Foo = () =>`, or a wrapped
// `const Foo = memo(() => {})` / `forwardRef(...)`.
function fnName(fn) {
  if (fn.node.id && fn.node.id.name) return fn.node.id.name;
  let p = fn.parentPath;
  while (p && p.isCallExpression()) p = p.parentPath; // unwrap memo()/forwardRef()
  if (p && p.isVariableDeclarator() && p.node.id && p.node.id.name) return p.node.id.name;
  return null;
}

// The nearest enclosing *capitalized* function = the component that owns this
// element. Walks up past anonymous callbacks (e.g. `.map(item => <li/>)`).
function ownerComponent(nodePath) {
  let fn = nodePath.getFunctionParent();
  while (fn) {
    const n = fnName(fn);
    if (n && /^[A-Z]/.test(n)) return n;
    fn = fn.getFunctionParent();
  }
  return null;
}

module.exports = function ({ types: t }) {
  return {
    name: "data-spotnote",
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const name = nodePath.node.name;

        // Only intrinsic/host elements (<div>), never components (<Foo>) —
        // a component may not forward the attribute to a real DOM node.
        if (name.type !== "JSXIdentifier") return;
        if (name.name[0] !== name.name[0].toLowerCase()) return;

        const loc = nodePath.node.loc;
        const filename = state.filename;
        if (!loc || !filename) return;

        // Don't double-stamp.
        const already = nodePath.node.attributes.some(
          (a) => a.type === "JSXAttribute" && a.name && a.name.name === "data-spotnote",
        );
        if (already) return;

        // Absolute path -> project-relative POSIX path.
        const root = (state.file && state.file.opts && state.file.opts.root) || process.cwd();
        const rel = path.relative(root, filename).replace(/\\/g, "/");

        // Note: Babel line is 1-based, column is 0-based. We store as-is and
        // add +1 to the column at open-in-editor time on the client.
        const value = `${rel}:${loc.start.line}:${loc.start.column}`;

        nodePath.node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier("data-spotnote"), t.stringLiteral(value)),
        );

        // Record the owning component so the client can show a name breadcrumb.
        const owner = ownerComponent(nodePath);
        if (owner) {
          nodePath.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("data-spotnote-name"), t.stringLiteral(owner)),
          );
        }
      },
    },
  };
};
