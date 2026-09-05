import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// maplibre-gl-worker.mjs imports this sibling module by its literal filename.
// When the worker is imported with ?url, Vite emits the worker but does not
// follow that internal import, so Cloudflare's SPA fallback would serve HTML
// for /assets/maplibre-gl-shared.mjs. Emit the sibling explicitly.
function maplibreSharedAsset(): Plugin {
  return {
    name: "maplibre-shared-asset",
    apply: "build" as const,
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "assets/maplibre-gl-shared.mjs",
        source: readFileSync(resolve(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs")),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), maplibreSharedAsset()],
  optimizeDeps: {
    include: ["pdf-lib", "qrcode"],
    // MapLibre loads its Web Worker itself. Vite's pre-bundler otherwise emits a
    // stale maplibre-gl-worker.mjs reference during local development.
    exclude: ["maplibre-gl"],
  },
  worker: { format: "es" },
  build: { sourcemap: false },
});
