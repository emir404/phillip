import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dashboard imports only *types* from @nutz/phillip, so they erase at build
// time and Vite never needs to resolve the package. React SPA, nothing fancy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
  },
});
