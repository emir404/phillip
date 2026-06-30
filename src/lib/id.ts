// IDs without a dependency. Prefers crypto.randomUUID; falls back for
// non-secure contexts where it may be unavailable.

export function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** A short, prefixed id, e.g. prefixedId("evt") -> "evt_1a2b3c4d5e6f7a8b". */
export function prefixedId(prefix: string): string {
  return `${prefix}_${uuid().replace(/-/g, "").slice(0, 16)}`;
}
