import { defineConfig } from "vite";
import spotnote from "spotnote";

// Pick the example framework with SPOTNOTE_FW (react | solid | vue | svelte).
const FW = process.env.SPOTNOTE_FW || "react";

async function frameworkPlugin() {
  if (FW === "vue") return (await import("@vitejs/plugin-vue")).default();
  if (FW === "solid") return (await import("vite-plugin-solid")).default();
  if (FW === "svelte") return (await import("@sveltejs/vite-plugin-svelte")).svelte();
  return (await import("@vitejs/plugin-react")).default();
}

export default defineConfig(async () => ({
  // Each framework has its own app under examples/<fw>.
  root: FW,
  server: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the injected picker client from package/src.
    fs: { allow: ["../.."] },
  },
  // spotnote is apply:'serve' + self-injecting, so prod builds stay untouched.
  // Its stamp runs as an order:"pre" transform, so array order doesn't matter.
  plugins: [spotnote(), await frameworkPlugin()],
}));
