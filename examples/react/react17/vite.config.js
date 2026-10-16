import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import spotnote from "spotnote";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the picker client from package/src.
  server: { fs: { allow: ["../../.."] } },
  // spotnote's stamp runs as an order:"pre" transform, so array order doesn't matter.
  plugins: [spotnote(), react()],
});
