// Vendored from AI SDK Elements' Suggestion: a horizontal, scrollbar-less rail
// of one-tap prompt pills.
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type SuggestionsProps = HTMLAttributes<HTMLDivElement>;

export function Suggestions({ className, ...props }: SuggestionsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export interface SuggestionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  label: string;
  onClick?: () => void;
}

export function Suggestion({ label, onClick, disabled, className, ...props }: SuggestionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border border-white/5 bg-ink-700/60 px-3.5 py-1.5 text-[13px] text-white/85 transition hover:bg-ink-700 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {label}
    </button>
  );
}
