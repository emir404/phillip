// Vendored from AI SDK Elements' Loader: a bare conic spinner (border ring
// with one bright quadrant) — no icon dependency, inherits scale via `size`.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Loader({ size = 14, className, style, ...props }: LoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white/80",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
}
