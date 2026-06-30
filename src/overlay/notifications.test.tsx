import { fireEvent, render } from "@testing-library/react";
import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Persona } from "../types/boot";
import { NotificationStack } from "./NotificationStack";
import type { Notification } from "./useNotifications";

const persona: Persona = {
  name: "Phillip",
  title: "Design partner",
  avatarUrl: "https://example.com/p.png",
};

const notification: Notification = {
  id: "notif-1",
  reason: "score",
  title: "Phillip",
  preview: "looks like this caught your eye. want a hand?",
};

function wrap(node: ReactNode) {
  return <LazyMotion features={domAnimation}>{node}</LazyMotion>;
}

describe("NotificationStack", () => {
  it("renders the preview and opens on body click without dismissing via the body", () => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      wrap(
        <NotificationStack
          notifications={[notification]}
          persona={persona}
          onOpen={onOpen}
          onDismiss={onDismiss}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      ),
    );

    const card = container.querySelector(".notif-card");
    expect(card).toBeTruthy();
    expect(container.textContent ?? "").toMatch(/caught your eye/i);

    const body = container.querySelector<HTMLButtonElement>(".notif-body");
    if (!body) throw new Error("no notification body");
    fireEvent.click(body);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses (not opens) when the × is clicked", () => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      wrap(
        <NotificationStack
          notifications={[notification]}
          persona={persona}
          onOpen={onOpen}
          onDismiss={onDismiss}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      ),
    );

    const dismiss = container.querySelector<HTMLButtonElement>(".notif-dismiss");
    if (!dismiss) throw new Error("no dismiss button");
    fireEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("renders nothing when there are no notifications", () => {
    const { container } = render(
      wrap(
        <NotificationStack
          notifications={[]}
          persona={persona}
          onOpen={vi.fn()}
          onDismiss={vi.fn()}
          onPause={vi.fn()}
          onResume={vi.fn()}
        />,
      ),
    );
    expect(container.querySelector(".notif-card")).toBeNull();
  });
});
