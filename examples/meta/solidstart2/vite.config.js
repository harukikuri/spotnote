import { fileURLToPath } from "node:url";
import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
import spotnote from "spotnote";
import { defineConfig } from "vite";

export default defineConfig({
  // spotnote is a symlinked workspace dep; allow the repo root so Vite can
  // serve the picker client from package/src.
  server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } },
  // SolidStart 2's dev toolbar imports this CommonJS package unbundled, which
  // fails in the browser ("does not provide an export named 'default'").
  optimizeDeps: { include: ["@solidjs/start > @jridgewell/trace-mapping"] },
  plugins: [spotnote(), solidStart(), nitro()],
});
