"use client";

import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

// Server pages can't reach into the client header, so dynamic breadcrumb
// leaves (the lead's business name on /leads/[id]) are published through this
// tiny context: the page renders <SetBreadcrumb label> and the header reads it.
const BreadcrumbContext = createContext<{
  title: string | null;
  setTitle: (title: string | null) => void;
} | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ title, setTitle }}>{children}</BreadcrumbContext.Provider>
  );
}

export function SetBreadcrumb({ label }: { label: string }) {
  const ctx = useContext(BreadcrumbContext);
  const setTitle = ctx?.setTitle;
  useEffect(() => {
    setTitle?.(label);
    return () => setTitle?.(null);
  }, [label, setTitle]);
  return null;
}

export function useBreadcrumbTitle(): string | null {
  return useContext(BreadcrumbContext)?.title ?? null;
}
