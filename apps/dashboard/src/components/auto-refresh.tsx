"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Server-rendered pages that show operational state (iterations, escalations,
// budget) re-render themselves on an interval — but only while the tab is
// actually being looked at.
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
