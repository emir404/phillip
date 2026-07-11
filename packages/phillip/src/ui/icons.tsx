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

// Attach a photo/file to a change request (the takeover's paperclip button).
export function Paperclip({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M17.5 8.5l-8 8a3 3 0 104.24 4.24l8-8a5 5 0 10-7.07-7.07l-8 8a7 7 0 109.9 9.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A pending image attachment's chip icon.
export function PhotoIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4 16l4.5-4.5a2 2 0 012.8 0L15 15.2l1.7-1.7a2 2 0 012.8 0L20.5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A pending non-image attachment's chip icon (a PDF, etc.).
export function FileIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 3.5h8l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

// Checkmark for completed states (e.g. a finished build in elements/task).
export function Check({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.5 12.75l5 5 10-11"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Crosshair for the takeover's element picker (pick-what-to-change mode).
export function Crosshair({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Points the way the sheet will move: up to expand, down to collapse.
export function Chevron({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 15l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The iMessage bubble tail — a self-contained shape filled with `currentColor`
// (set to the bubble's color), so it works over any background (no mask trick).
// Path lifted from the iMessage-simulator. Default orientation hooks to the
// bottom-right ("you"); flip with scaleX(-1) for the left/"them" side.
export function BubbleTail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 17 18"
      fill="currentColor"
      preserveAspectRatio="none"
      aria-hidden="true"
      {...props}
    >
      <path d="M1.8 11C2.79 11 3.44 11.31 4.77 12.24C5.48 12.74 8.22 14.84 10.49 16.09C12.45 17.17 14.13 17.91 14.55 17.94C15.81 18.04 15.97 16.85 15.48 16.21C14.99 15.57 14.43 14.74 14.21 14.29C13.73 13.28 13.58 12.75 13.58 11.24C13.58 9.38 14.9 8 15.94 7.08C16.03 7 16.15 6.9 16.29 6.79C16.53 6.6 16.76 6.41 16.99 6.22V0H0V11H1.8Z" />
    </svg>
  );
}
