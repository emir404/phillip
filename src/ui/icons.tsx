// Tiny inline SVGs so the size-critical drop-in never pulls an icon package.
// Glyphs adapted from Phosphor (MIT). Each takes a `size` and inherits color
// via `currentColor`, so callers control sizing/color from CSS.
import type { SVGProps } from "react";

type IconProps = { size?: number } & SVGProps<SVGSVGElement>;

// Upward send arrow. The geometric center of an up-arrow sits visually low
// (the head is top-heavy), so the whole glyph is nudged down ~0.5px to read
// optically centered inside the circular send button.
export function SendArrow({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: "translateY(0.5px)", ...props.style }}
      {...props}
    >
      <path
        d="M12 19V6M12 6l-6 6M12 6l6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Close({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Dismiss({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
