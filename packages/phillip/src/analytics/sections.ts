// Watches which sections of the host page hold the lead's attention, and for
// how long. Sections are marked with [data-section] (preferred) or a <section
// id>. Time-on-pricing is the high-intent signal the score leans on.

function sectionName(el: Element): string {
  const dataName = el instanceof HTMLElement ? el.dataset.section : undefined;
  return dataName || el.id || el.tagName.toLowerCase();
}

export class SectionTracker {
  private observer?: IntersectionObserver;
  private visibleSince = new Map<string, number>();
  private dwellMs = new Map<string, number>();
  private seen = new Set<string>();
  private onView?: (name: string) => void;

  start(onView?: (name: string) => void): void {
    this.onView = onView;
    const els = document.querySelectorAll("[data-section], section[id]");
    if (typeof IntersectionObserver === "undefined") return;

    this.observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        for (const entry of entries) {
          const name = sectionName(entry.target);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            if (!this.visibleSince.has(name)) {
              this.visibleSince.set(name, now);
              if (!this.seen.has(name)) {
                this.seen.add(name);
                this.onView?.(name);
              }
            }
          } else {
            this.flush(name, now);
          }
        }
      },
      { threshold: [0, 0.4, 0.75] },
    );
    for (const el of els) this.observer.observe(el);
  }

  private flush(name: string, now: number): void {
    const since = this.visibleSince.get(name);
    if (since != null) {
      this.dwellMs.set(name, (this.dwellMs.get(name) ?? 0) + (now - since));
      this.visibleSince.delete(name);
    }
  }

  /** Accumulated dwell for a section, including any in-progress visible interval. */
  dwellSec(name: string): number {
    const base = this.dwellMs.get(name) ?? 0;
    const since = this.visibleSince.get(name);
    const live = since != null ? Date.now() - since : 0;
    return (base + live) / 1000;
  }

  /** Dwell (seconds, rounded) for every section seen — the heatmap source. */
  dwellBySection(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const name of this.seen) out[name] = Math.round(this.dwellSec(name) * 10) / 10;
    return out;
  }

  distinctCount(): number {
    return this.seen.size;
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
