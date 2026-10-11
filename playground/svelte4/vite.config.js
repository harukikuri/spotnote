import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import spotnote from "spotnote";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the injected picker client from plugin/src.
  server: { fs: { allow: ["../.."] } },
  plugins: [spotnote(), svelte()],
});
