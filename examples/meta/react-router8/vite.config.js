import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import spotnote from "spotnote";
import { defineConfig } from "vite";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the picker client from package/src.
  server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } },
  plugins: [spotnote(), reactRouter()],
});
