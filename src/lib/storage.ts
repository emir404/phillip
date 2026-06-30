import { prefixedId } from "./id";

// Namespaced, failure-tolerant localStorage. Private mode, disabled storage,
// and SSR all degrade to no-ops instead of throwing.

const PREFIX = "phillip:";

function probe(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    const k = `${PREFIX}__probe`;
    ls.setItem(k, "1");
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

const store = probe();

export function getItem(key: string): string | null {
  if (!store) return null;
  try {
    return store.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (!store) return;
  try {
    store.setItem(PREFIX + key, value);
  } catch {
    // quota or disabled — ignore
  }
}

export function removeItem(key: string): void {
  if (!store) return;
  try {
    store.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

const VISITOR_KEY = "visitorId";
const LAST_SEEN_KEY = "lastSeenAt";

export interface VisitorInfo {
  visitorId: string;
  returning: boolean;
  /** Epoch ms of the previous visit, if any. */
  lastSeenAt?: number;
}

/**
 * Resolve a stable visitor id and whether this is a return visit, then stamp
 * the current visit time. `now` is injected so callers/tests stay deterministic.
 */
export function resolveVisitor(now: number): VisitorInfo {
  const existing = getItem(VISITOR_KEY);
  const lastSeenRaw = getItem(LAST_SEEN_KEY);
  const lastSeenAt = lastSeenRaw ? Number(lastSeenRaw) : undefined;

  const visitorId = existing ?? prefixedId("vis");
  if (!existing) setItem(VISITOR_KEY, visitorId);
  setItem(LAST_SEEN_KEY, String(now));

  return {
    visitorId,
    returning: Boolean(existing),
    lastSeenAt: Number.isFinite(lastSeenAt) ? lastSeenAt : undefined,
  };
}
