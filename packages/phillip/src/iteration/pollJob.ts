import type { TransportClient } from "../transport";
import type { IterationJob } from "../transport/types";

export interface PollOptions {
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

/**
 * Poll an iteration job until it settles — done, failed, or handed to a human
 * (`queued_manual`) — or we give up / abort.
 */
export async function pollJob(
  client: TransportClient,
  id: string,
  opts: PollOptions = {},
): Promise<IterationJob> {
  const interval = opts.intervalMs ?? 1200;
  const maxAttempts = opts.maxAttempts ?? 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw new Error("aborted");
    const job = await client.getIteration(id);
    if (job.status === "done" || job.status === "failed" || job.status === "queued_manual") {
      return job;
    }
    await sleep(interval, opts.signal);
  }
  throw new Error("iteration timed out");
}
