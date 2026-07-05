import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom (not happy-dom): it leaves global.fetch as Node's undici, which MSW
    // intercepts cleanly — happy-dom's own fetch double-locks streamed bodies.
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "mock/**/*.test.ts"],
    css: false,
  },
});
