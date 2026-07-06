// Tracks whether the lead is actively engaged so the score only counts *active*
// time. Active = the tab is visible and there's been input recently.
export class ActivityMonitor {
  private lastActivity = Date.now();
  private visible = true;
  private cleanups: Array<() => void> = [];

  start(): void {
    const mark = () => {
      this.lastActivity = Date.now();
    };
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "wheel",
    ];
    for (const e of events) {
      window.addEventListener(e, mark, { passive: true });
      this.cleanups.push(() => window.removeEventListener(e, mark));
    }

    const onVisibility = () => {
      this.visible = document.visibilityState === "visible";
      if (this.visible) mark();
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
    this.visible = document.visibilityState === "visible";
  }

  isActive(idleTimeoutMs = 15_000): boolean {
    return this.visible && Date.now() - this.lastActivity < idleTimeoutMs;
  }

  stop(): void {
    for (const c of this.cleanups) c();
    this.cleanups = [];
  }
}
