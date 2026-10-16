import { defineConfig } from "astro/config";
import spotnote from "spotnote";

export default defineConfig({
  // The same pages as the Astro 7 example.
  srcDir: "../astro/src",
  vite: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the picker client from package/src, and the shared styles.
    server: { fs: { allow: ["../.."] } },
    plugins: [spotnote()],
  },
});
