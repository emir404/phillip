import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class lists: clsx for conditionals, tailwind-merge so a
 * caller's `className` override wins over a component's defaults (last
 * conflicting utility survives instead of fighting in specificity).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
