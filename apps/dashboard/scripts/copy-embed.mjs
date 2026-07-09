// Copies the built drop-in embed (packages/phillip's IIFE) into the
// dashboard's public/ dir so Next serves it at /phillip.js — the script tag
// origin then doubles as the widget's apiBase. Runs before `next build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../../packages/phillip/dist/preview.global.js");
const destDir = resolve(here, "../public");
const dest = resolve(destDir, "phillip.js");

if (!existsSync(src)) {
  console.error(`copy-embed: ${src} not found — run \`pnpm --filter @nutz/phillip build\` first.`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`copy-embed: wrote ${dest} (${statSync(dest).size} bytes)`);
