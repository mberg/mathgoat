import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ["@observablehq/plot"] } },
    },
  },
  server: { proxy: { "/api": "http://127.0.0.1:8789" } },
});
