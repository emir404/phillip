import { type ReactNode, createContext, useContext } from "react";
import type { Tracker } from "../analytics/tracker";
import type { TransportClient } from "../transport";
import type { BootConfig } from "../types/boot";
import type { RuntimeConfig } from "./config";

// Shared runtime every component reads: the boot config, the transport client,
// the analytics tracker, and the resolved runtime config. State carries the
// customer, not memory.
export interface PhillipRuntime {
  runtime: RuntimeConfig;
  client: TransportClient;
  config: BootConfig;
  tracker: Tracker;
}

const Ctx = createContext<PhillipRuntime | null>(null);

export function PhillipProvider({
  value,
  children,
}: {
  value: PhillipRuntime;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePhillip(): PhillipRuntime {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePhillip must be used within a PhillipProvider");
  return v;
}
