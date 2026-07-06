// Deterministic avatar for a business name: two letters on a chip. Shade
// varies per name for visual distinction in a list, but stays within the
// one signature blue, never a different hue.
const TONES = ["b1", "b2", "b3", "b4"] as const;

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .split(/\s+/);
  const [first, second] = words;
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

export function toneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length] ?? "b1";
}
