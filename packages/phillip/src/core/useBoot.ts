import { useEffect, useState } from "react";
import type { TransportClient } from "../transport";
import type { BootConfig } from "../types/boot";
import { bootEmbed } from "./boot";

export type BootState =
  | { status: "loading" }
  | { status: "ready"; config: BootConfig }
  | { status: "error"; error: unknown };

export function useBoot(previewId: string, client: TransportClient): BootState {
  const [state, setState] = useState<BootState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    bootEmbed(previewId, client)
      .then((config) => {
        if (alive) setState({ status: "ready", config });
      })
      .catch((error) => {
        if (alive) setState({ status: "error", error });
      });
    return () => {
      alive = false;
    };
  }, [previewId, client]);

  return state;
}
