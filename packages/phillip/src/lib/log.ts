// Debug-gated logger. Warnings and errors always print; debug/info only when
// the embed is booted with data-debug (or ?phillip_debug). Keeps the console
// quiet on real previews while staying inspectable during development.

let debugEnabled = false;

export function setDebug(on: boolean): void {
  debugEnabled = on;
}

export function isDebug(): boolean {
  return debugEnabled;
}

const TAG = "[phillip]";

export const log = {
  debug(...args: unknown[]): void {
    if (debugEnabled) console.debug(TAG, ...args);
  },
  info(...args: unknown[]): void {
    if (debugEnabled) console.info(TAG, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(TAG, ...args);
  },
  error(...args: unknown[]): void {
    console.error(TAG, ...args);
  },
};
