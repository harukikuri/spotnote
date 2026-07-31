import { defineConfig } from "vite";
import spotnote from "spotnote";

// Pick the playground framework with SPOTNOTE_FW (react | solid | vue | svelte).
const FW = process.env.SPOTNOTE_FW || "react";

async function frameworkPlugin() {
  if (FW === "vue") return (await import("@vitejs/plugin-vue")).default();
  if (FW === "solid") return (await import("vite-plugin-solid")).default();
  if (FW === "svelte") return (await import("@sveltejs/vite-plugin-svelte")).svelte();
  return (await import("@vitejs/plugin-react")).default();
}

export default defineConfig(async () => ({
  // Each framework has its own app under playground/<fw>.
  root: FW,
  server: {
    // spotnote is a symlinked workspace dep; allow the repo root so Vite can
    // serve the injected picker client from plugin/src.
    fs: { allow: ["../.."] },
  },
  // spotnote() must precede the framework plugin so its enforce:"pre" JSX stamp
  // runs before the framework's own JSX compile (matters for Solid). It's
  // apply:'serve' + self-injecting, so prod builds stay untouched.
  plugins: [spotnote(), await frameworkPlugin()],
}));
