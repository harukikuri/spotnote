import { fileURLToPath } from "node:url";
import spotnote from "spotnote";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  srcDir: "app/", // Nuxt 4's layout
  devtools: { enabled: false },
  telemetry: false,
  css: ["~/demo/styles.css"],
  vite: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the picker client from package/src.
    server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } },
    plugins: [spotnote()],
  },
});
