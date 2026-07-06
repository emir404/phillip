// A tiny typed pub/sub. The non-React controllers (analytics tracker,
// trigger engine) emit on it; React subscribes. Keeps the DOM-watching layer
// decoupled from the view.

export type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<unknown>>>();

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<unknown>);
    return () => {
      this.handlers.get(type)?.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    // Copy so a handler that unsubscribes mid-emit doesn't skip siblings.
    for (const h of [...set]) (h as Handler<Events[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
