import { useCallback, useEffect, useRef, useState } from "react";
import type { PingReason } from "../types/events";

export interface Notification {
  id: string;
  reason: PingReason;
  title: string;
  preview: string;
}

const AUTO_DISMISS_MS = 12_000;

let counter = 0;
const nextId = () => `notif-${++counter}`;

// Owns the live notification(s). A ping pushes one; it auto-dismisses after a
// while unless acted on. Timers are tracked per-id and cleared on unmount so we
// never set state on a torn-down widget.
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setNotifications((list) => list.filter((n) => n.id !== id));
    },
    [clearTimer],
  );

  const clear = useCallback(() => {
    for (const t of timers.current.values()) clearTimeout(t);
    timers.current.clear();
    setNotifications([]);
  }, []);

  const push = useCallback(
    (reason: PingReason, title: string, preview: string) => {
      const id = nextId();
      // One notification on screen at a time — a new ping replaces the old.
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
      setNotifications([{ id, reason, title, preview }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
      return id;
    },
    [dismiss],
  );

  // Pause the auto-dismiss while hovered; resume (fresh window) on leave.
  const pause = useCallback((id: string) => clearTimer(id), [clearTimer]);
  const resume = useCallback(
    (id: string) => {
      clearTimer(id);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [clearTimer, dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  return { notifications, push, dismiss, clear, pause, resume };
}
