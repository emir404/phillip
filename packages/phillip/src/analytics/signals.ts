import type { TrackFn } from "../types/events";

// Ignore events that originate inside our own widget. Shadow-DOM events retarget
// to the host element at the boundary, so checking the (retargeted) target for
// our host marker is enough.
function fromWidget(target: EventTarget | null): boolean {
  const el = target as Element | null;
  return !!el && typeof el.closest === "function" && !!el.closest("[data-phillip-host]");
}

// On-page intent signals: scroll depth, clicks, CTA hovers, gallery opens,
// video plays, and contact taps.
export class SignalTracker {
  scrollDepthPct = 0;
  clicks = 0;
  ctaHovers = 0;
  galleryOpens = 0;
  videoPlays = 0;
  contactInteractions = 0;

  private cleanups: Array<() => void> = [];
  private lastHover: Element | null = null;

  start(emit: TrackFn): void {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      if (pct > this.scrollDepthPct) {
        this.scrollDepthPct = pct;
        emit("scroll_depth", { pct });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    this.cleanups.push(() => window.removeEventListener("scroll", onScroll));
    onScroll();

    const onPointerOver = (e: Event) => {
      if (fromWidget(e.target)) return;
      const cta = (e.target as Element | null)?.closest?.("[data-cta]");
      if (cta && cta !== this.lastHover) {
        this.lastHover = cta;
        this.ctaHovers += 1;
        emit("cta_hover", { target: (cta as HTMLElement).dataset.cta ?? "cta" });
      }
    };
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    this.cleanups.push(() => document.removeEventListener("pointerover", onPointerOver));

    const onClick = (e: Event) => {
      if (fromWidget(e.target)) return;
      const el = e.target as Element | null;
      this.clicks += 1;
      emit("click", {});
      if (el?.closest?.("[data-gallery]")) {
        this.galleryOpens += 1;
        emit("gallery_open", {});
      }
      if (el?.closest?.('a[href^="tel:"], a[href^="mailto:"], [data-contact]')) {
        this.contactInteractions += 1;
        emit("contact_interaction", {});
      }
    };
    document.addEventListener("click", onClick, { passive: true });
    this.cleanups.push(() => document.removeEventListener("click", onClick));

    // `play` doesn't bubble — listen in the capture phase.
    const onPlay = (e: Event) => {
      if (fromWidget(e.target)) return;
      this.videoPlays += 1;
      emit("video_play", {});
    };
    document.addEventListener("play", onPlay, true);
    this.cleanups.push(() => document.removeEventListener("play", onPlay, true));
  }

  stop(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
