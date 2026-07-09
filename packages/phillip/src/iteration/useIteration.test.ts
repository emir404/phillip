import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Tracker } from "../analytics";
import type { TransportClient } from "../transport";
import type { IterationJob } from "../transport/types";
import { pollJob } from "./pollJob";
import { useIteration } from "./useIteration";

const tracker = { track: () => {} } as unknown as Tracker;

/** A client whose job walks the given statuses, one per poll (last one sticks). */
function clientWith(statuses: IterationJob["status"][]): TransportClient {
  let polls = 0;
  return {
    createIteration: () => Promise.resolve<IterationJob>({ id: "itr_1", status: "queued" }),
    getIteration: () => {
      const status = statuses[Math.min(polls, statuses.length - 1)] ?? "failed";
      polls += 1;
      return Promise.resolve<IterationJob>({ id: "itr_1", status });
    },
  } as unknown as TransportClient;
}

describe("queued_manual (human handoff)", () => {
  it("pollJob treats queued_manual as terminal", async () => {
    const job = await pollJob(clientWith(["processing", "queued_manual"]), "itr_1", {
      intervalMs: 1,
    });
    expect(job.status).toBe("queued_manual");
  });

  it("useIteration returns to idle (not failed) and calls onManual", async () => {
    const onManual = vi.fn();
    const onFailed = vi.fn();
    const { result } = renderHook(() =>
      useIteration({
        client: clientWith(["queued_manual"]),
        previewId: "prv_1",
        tracker,
        pollIntervalMs: 1,
        onManual,
        onFailed,
      }),
    );

    act(() => result.current.submit({ items: [{ kind: "palette" }] }));
    await waitFor(() => expect(onManual).toHaveBeenCalledTimes(1));

    expect(onFailed).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
    expect(result.current.busy).toBe(false);
  });
});

describe("session attribution", () => {
  it("passes sessionId through to createIteration", async () => {
    const createIteration = vi
      .fn()
      .mockResolvedValue({ id: "itr_1", status: "done" } satisfies IterationJob);
    const client = {
      createIteration,
      getIteration: () => Promise.resolve<IterationJob>({ id: "itr_1", status: "done" }),
    } as unknown as TransportClient;

    const { result } = renderHook(() =>
      useIteration({ client, previewId: "prv_1", sessionId: "ses_42", tracker, pollIntervalMs: 1 }),
    );
    act(() => result.current.submit({ items: [], freeText: "rename it" }));

    await waitFor(() =>
      expect(createIteration).toHaveBeenCalledWith(
        expect.objectContaining({ previewId: "prv_1", sessionId: "ses_42", round: 1 }),
      ),
    );
  });
});
