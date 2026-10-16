import { defineConfig } from "astro/config";
import spotnote from "spotnote";

export default defineConfig({
  vite: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the picker client from package/src.
    server: { fs: { allow: ["../../.."] } },
    plugins: [spotnote()],
  },
});
