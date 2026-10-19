import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import spotnote from "spotnote";

// Built into the docs and served at /try (the "Try it" button in their header),
// with Spotnote kept in the build by its `build` option.
export default defineConfig({
  base: "/try/",
  build: { outDir: "../docs/public/try", emptyOutDir: true },
  plugins: [react(), spotnote({ build: ["playground"] })],
});
