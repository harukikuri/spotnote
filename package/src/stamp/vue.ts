// Vue SFCs aren't JSX, so Babel can't reach them. Instead we parse the SFC with
// the app's own `vue/compiler-sfc` and splice `data-spotnote` onto each native
// template element.
import path from "node:path";
import MagicString from "magic-string";
import { appImport, perRoot, relPath, stampAttrs, type Stamper } from "./shared.ts";

type VueNode = {
  type: number;
  tagType?: number;
  tag?: string;
  loc?: { start: { offset: number; line: number; column: number } };
  props?: { type: number; name?: string }[];
  children?: VueNode[];
};
type VueParse = (
  code: string,
  options: { filename: string },
) => { descriptor: { template?: { ast?: VueNode } | null }; errors: unknown[] };
const getParse = perRoot(async (root) => (await appImport(root, "vue/compiler-sfc")).parse as VueParse);

export const vue: Stamper = {
  // Only the raw SFC import — skip the ?vue&type= sub-requests that the
  // Vue plugin derives from our already-stamped code.
  handles: (file, id) => file.endsWith(".vue") && !id.includes("?"),

  // Walk the template AST and stamp every native host element (tagType 0).
  // Element `loc.start.offset` is absolute in the SFC source, and we only
  // insert within a line (line numbers preserved).
  async stamp(code, file, { root, top }, used) {
    const parse = await getParse(root);
    if (!parse) return null;
    const { descriptor, errors } = parse(code, { filename: file });
    if (errors.length) throw errors[0];
    if (!descriptor.template?.ast) return;
    const rel = relPath(top, file);
    // The SFC's component name ≈ its filename (Vue/devtools convention).
    const name = path.basename(file, path.extname(file));
    const s = new MagicString(code);
    let touched = false;
    const visit = (node: VueNode | undefined) => {
      if (!node) return;
      // NodeTypes.ELEMENT === 1, ElementTypes.ELEMENT === 0 (a real DOM tag).
      // ElementTypes.COMPONENT === 1: where a component is used (see jsx.ts).
      if (node.type === 1 && node.tagType === 1 && node.tag && node.loc)
        used.push([node.tag, node.loc.start.line, node.loc.start.column]);
      if (node.type === 1 && node.tagType === 0 && node.tag && node.loc) {
        const already = (node.props || []).some((p) => p.type === 6 && p.name === "data-spotnote");
        if (!already) {
          const { offset, line, column } = node.loc.start;
          // Just past "<tag". Vue's line and column are already 1-based, like the other stamps.
          s.appendLeft(offset + 1 + node.tag.length, stampAttrs(rel, line, column, name));
          touched = true;
        }
      }
      (node.children || []).forEach(visit);
    };
    visit(descriptor.template.ast);
    if (!touched) return;
    // MagicString tracks the offsets as it inserts, and gives a real source map.
    return { code: s.toString(), map: s.generateMap({ source: file, hires: true }) };
  },
};
