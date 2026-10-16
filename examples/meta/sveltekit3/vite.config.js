import { fileURLToPath } from "node:url";
import adapter from "@sveltejs/adapter-auto";
import { sveltekit } from "@sveltejs/kit/vite";
import spotnote from "spotnote";
import { defineConfig } from "vite";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the picker client from package/src.
  server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } },
  plugins: [spotnote(), sveltekit({ adapter: adapter() })],
});
