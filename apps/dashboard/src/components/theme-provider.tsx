"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps, ReactNode } from "react";

// `children` is explicit: next-themes' d.ts can't reach @types/react under
// pnpm's strict node_modules, so its PropsWithChildren degrades to `any`.
export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider> & { children?: ReactNode },
) {
  return <NextThemesProvider {...props} />;
}
