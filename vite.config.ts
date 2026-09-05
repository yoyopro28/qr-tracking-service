import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["pdf-lib", "qrcode"],
    // MapLibre loads its Web Worker itself. Vite's pre-bundler otherwise emits a
    // stale maplibre-gl-worker.mjs reference during local development.
    exclude: ["maplibre-gl"],
  },
  worker: { format: "es" },
  build: { sourcemap: false },
});
