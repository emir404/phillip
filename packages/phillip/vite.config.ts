import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev playground only. Serves playground/ with the embed aliased to src so
// edits hot-reload, and MSW (started in playground/main.tsx) fakes the backend.
const root = import.meta.dirname;

export default defineConfig({
  root: resolve(root, "playground"),
  plugins: [react()],
  resolve: {
    alias: {
      "@nutz/phillip": resolve(root, "src/index.ts"),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
