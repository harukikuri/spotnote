import type { FilterPattern, Plugin } from "vite";

export interface SpotnoteOptions {
  /**
   * Files not to stamp: globs relative to the Vite root, or RegExps matched
   * against the absolute path. For a file whose lowercase JSX isn't the DOM
   * and shares a tag name with it, such as React Three Fiber's `<line>`.
   */
  exclude?: FilterPattern;
  /**
   * spotnote-mcp's port. Defaults to `SPOTNOTE_PORT`, then 4848. Set the
   * same port in your agent's `SPOTNOTE_PORT`.
   */
  port?: number;
}

/**
 * Spotnote — a dev-only Vite plugin.
 *
 * Stamps `data-spotnote="file:line:column"` onto host elements (JSX via a Babel
 * pass, `.vue` templates via `vue/compiler-sfc`, `.svelte` markup via
 * `svelte/compiler`, `.astro` markup via Astro's compiler) and auto-injects the browser
 * picker client. It runs only on the dev server, so production builds and
 * Vitest runs are untouched.
 *
 * Add it once to your Vite `plugins`; the options are optional.
 *
 * @example
 * import spotnote from "spotnote";
 * export default defineConfig({ plugins: [react(), spotnote()] });
 */
export default function spotnote(options?: SpotnoteOptions): Plugin[];
