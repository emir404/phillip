import { m, useReducedMotion } from "motion/react";
import { Avatar } from "../chat/Avatar";
import type { Persona } from "../types/boot";
import { Dismiss } from "../ui/icons";
import { notificationVariants, press, tapTransition } from "./motion";
import type { Notification } from "./useNotifications";

// An iMessage-style banner: avatar + sender + one-line preview. The body opens
// the conversation; the × dismisses just this notification. Hovering pauses the
// auto-dismiss so it can be read.
export function NotificationCard({
  notification,
  persona,
  onOpen,
  onDismiss,
  onPause,
  onResume,
}: {
  notification: Notification;
  persona: Persona;
  onOpen: () => void;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      className="notif-card"
      variants={notificationVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
      onHoverStart={onPause}
      onHoverEnd={onResume}
    >
      <button type="button" className="notif-body" onClick={onOpen}>
        <Avatar persona={persona} size="sm" />
        <span className="notif-text">
          <span className="notif-name">{notification.title}</span>
          <span className="notif-preview">{notification.preview}</span>
        </span>
      </button>
      <m.button
        type="button"
        className="notif-dismiss"
        onClick={onDismiss}
        aria-label="dismiss"
        whileTap={press}
        transition={tapTransition}
      >
        <Dismiss size={13} />
      </m.button>
    </m.div>
  );
}
