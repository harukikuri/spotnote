import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import spotnote from "spotnote";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the picker client from package/src.
  server: { fs: { allow: ["../../.."] } },
  // spotnote's stamp runs as an order:"pre" transform, so array order doesn't matter.
  // `vite build --mode staging` keeps it in the build, sending notes to
  // SPOTNOTE_WEBHOOK if set, with a screenshot if SPOTNOTE_SCREENSHOT has its
  // settings (JSON; e2e/build.spec.js).
  plugins: [
    spotnote({
      build: ["staging"],
      webhook: process.env.SPOTNOTE_WEBHOOK,
      screenshot: process.env.SPOTNOTE_SCREENSHOT && JSON.parse(process.env.SPOTNOTE_SCREENSHOT),
    }),
    react(),
  ],
});
