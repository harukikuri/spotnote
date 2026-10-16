import type { Plugin } from "vite";

/**
 * Spotnote — a dev-only Vite plugin.
 *
 * Stamps `data-spotnote="file:line:column"` onto host elements (JSX via a Babel
 * pass, `.vue` templates via `vue/compiler-sfc`, `.svelte` markup via
 * `svelte/compiler`) and auto-injects the browser
 * picker client. It runs only on the dev server, so production builds and
 * Vitest runs are untouched.
 *
 * Takes no options; add it once to your Vite `plugins`.
 *
 * @example
 * import spotnote from "spotnote";
 * export default defineConfig({ plugins: [react(), spotnote()] });
 */
export default function spotnote(): Plugin[];
