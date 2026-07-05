import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mock/server";

// Motion runs under jsdom in tests. Skip the actual tweens so AnimatePresence
// exits resolve synchronously (elements unmount immediately) — otherwise an
// exiting Panel would linger and trip class/text assertions during cleanup.
MotionGlobalConfig.skipAnimations = true;

// jsdom has no matchMedia; useReducedMotion() needs it. Default to "no
// preference" so component tests exercise the normal (non-reduced) path.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// One MSW node server for the whole suite. Pure unit tests never hit it;
// component/transport tests exercise the real fetch/SSE path against it.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
