import { defineConfig } from "tsup";

// Two builds from one config:
//   (a) the React library entry — react/react-dom stay external (peer deps)
//   (b) the standalone drop-in IIFE — react is bundled in and NODE_ENV is
//       pinned to production so React ships its minified runtime.
export default defineConfig([
  {
    // `greeting` and `i18n` ship as their own entries so a server can import
    // the shared copy without pulling in React.
    entry: {
      index: "src/index.ts",
      greeting: "src/intent/greeting.ts",
      i18n: "src/i18n/language.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    treeshake: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".js" };
    },
  },
  {
    entry: { preview: "src/preview.ts" },
    format: ["iife"],
    globalName: "Phillip",
    platform: "browser",
    minify: true,
    treeshake: true,
    sourcemap: true,
    dts: false,
    noExternal: ["react", "react-dom", "react/jsx-runtime"],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    outExtension() {
      return { js: ".global.js" };
    },
  },
]);
