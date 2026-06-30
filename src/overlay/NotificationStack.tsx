import { AnimatePresence } from "motion/react";
import type { Persona } from "../types/boot";
import { NotificationCard } from "./NotificationCard";
import type { Notification } from "./useNotifications";

// Fixed bottom-right column sitting above the vignette. The stack itself is
// click-through (pointer-events:none); only the cards capture clicks, so the
// page underneath stays interactive between notifications.
export function NotificationStack({
  notifications,
  persona,
  onOpen,
  onDismiss,
  onPause,
  onResume,
}: {
  notifications: Notification[];
  persona: Persona;
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  return (
    <div className="notif-stack">
      <AnimatePresence>
        {notifications.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            persona={persona}
            onOpen={() => onOpen(n.id)}
            onDismiss={() => onDismiss(n.id)}
            onPause={() => onPause(n.id)}
            onResume={() => onResume(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
