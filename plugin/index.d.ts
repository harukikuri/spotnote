import type { Plugin } from "vite";

/**
 * Spotnote — a dev-only Vite plugin.
 *
 * Stamps `data-spotnote="file:line:column"` onto host elements (JSX via a Babel
 * pass, `.vue` templates via `vue/compiler-sfc`) and auto-injects the browser
 * picker client. It runs with `apply: "serve"`, so production builds are
 * untouched.
 *
 * Takes no options; add it once to your Vite `plugins`.
 *
 * @example
 * import spotnote from "spotnote";
 * export default defineConfig({ plugins: [react(), spotnote()] });
 */
export default function spotnote(): Plugin;
