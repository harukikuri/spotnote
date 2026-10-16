import { fileURLToPath } from "node:url";
import { defineConfig } from "@solidjs/start/config";
import spotnote from "spotnote";

export default defineConfig({
  vite: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the picker client from package/src.
    server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } },
    plugins: [spotnote()],
  },
});
