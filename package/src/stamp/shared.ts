// What every stamper shares. A stamper adds `data-spotnote="file:line:column"`
// (and the component's name) to the native elements of one kind of file:
//   jsx.ts     .jsx and .tsx, with Babel
//   vue.ts     .vue templates, with the app's vue/compiler-sfc
//   svelte.ts  .svelte markup, with the app's svelte/compiler
//   astro.ts   .astro markup, with the app's Astro compiler
// Another kind of file is another stamper: a file here, and a line in STAMPERS
// (../index.ts).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { Rollup } from "vite";

// Where a component is used: [name, line, column].
export type Use = [string, number, number];

// The paths stamps name, and where a file's compiler comes from.
export interface Where {
  root: string; // the Vite root: the app, and its dependencies
  top: string; // the repository's root: stamped paths are relative to it
}

// The stamped code and its source map.
export type Stamped = { code: string; map: Rollup.SourceMapInput };

export interface Stamper {
  // Whether it stamps this module: `file` is its path, `id` may add a ?query.
  handles(file: string, id: string): boolean;
  // Pushes to `used` where the file uses components. Resolves to null when
  // the app doesn't have the compiler, undefined when nothing changed; throws
  // when the file doesn't parse.
  stamp(code: string, file: string, at: Where, used: Use[]): Promise<Stamped | null | undefined>;
}

// The client's virtual module: importing it boots the picker (see ../index.ts).
export const VIRTUAL = "virtual:spotnote-client";

// The attributes spliced in after a tag's name, for markup (JSX gets them as
// Babel nodes): its place in the source and the component it's in.
export const stampAttrs = (rel: string, line: number, column: number, name: string): string =>
  ` data-spotnote="${rel}:${line}:${column}" data-spotnote-name="${name}"`;

// The path stamps give a file: from the repository's root, with / on Windows too.
export const relPath = (top: string, file: string): string => path.relative(top, file).replace(/\\/g, "/") || file;

// Hands the page where each component is used in a file: [name, line, column]
// for every <Component> in it, which the prompt reads (client/prompt.ts).
export const usesScript = (rel: string, used: Use[]): string =>
  `\n(globalThis.__spotnoteUses ??= {})[${JSON.stringify(rel)}] = ${JSON.stringify(used)};`;

// The compilers come from the app's own dependencies, so the plugin keeps
// none of its own. Each is loaded lazily, once per app root (a test run stamps
// apps on different versions), and is null when the app doesn't have it: that
// file type then just isn't stamped.
export function perRoot<T>(load: (root: string) => Promise<T>): (root: string) => Promise<T | null> {
  const cache = new Map<string, Promise<T | null>>();
  return (root) => {
    let got = cache.get(root);
    if (!got) cache.set(root, (got = load(root).catch(() => null)));
    return got;
  };
}
// A module of the app's, untyped here: each stamper names the few fields it uses.
export const appImport = async (root: string, pkg: string): Promise<Record<string, unknown>> =>
  import(pathToFileURL(createRequire(path.join(root, "index.js")).resolve(pkg)).href);

// Offset → { line, column }, both 1-based like the JSX/Vue stamps.
export function offsetToLineCol(code: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

// Generic tree walk over the parsed markup (we don't care about node kinds
// except native elements). N: the fields the caller reads off a node with a
// string `type`, as its parser makes them.
export function walkAst<N>(node: unknown, visit: (node: N) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walkAst(n, visit);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.type === "string") visit(node as N);
  for (const key in record) {
    if (key === "parent") continue;
    walkAst(record[key], visit);
  }
}
