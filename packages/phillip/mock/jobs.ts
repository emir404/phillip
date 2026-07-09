import { prefixedId } from "../src/lib/id";
import type { IterationJob } from "../src/transport/types";

// Stateful iteration jobs: a job reports "processing" for a couple of polls,
// then "done" with a fresh result url — enough to drive the on-screen
// "give me a sec" → "done, refresh" loop.

interface JobState {
  job: IterationJob;
  polls: number;
  readyAfter: number;
}

const jobs = new Map<string, JobState>();

export function createJob(_previewId: string): IterationJob {
  const id = prefixedId("itr");
  const job: IterationJob = { id, status: "queued" };
  jobs.set(id, { job, polls: 0, readyAfter: 2 });
  return { ...job };
}

export function advanceJob(id: string): IterationJob | null {
  const state = jobs.get(id);
  if (!state) return null;
  state.polls += 1;
  if (state.polls >= state.readyAfter) {
    state.job.status = "done";
    // Same-origin relative URL, mirroring the real executor's `?v=N` on the
    // site's own domain — the takeover iframe (and its element picker) then
    // behave in the playground exactly as in production.
    state.job.resultUrl = `/?v=${state.polls + 1}`;
    state.job.version = state.polls + 1;
  } else {
    state.job.status = "processing";
  }
  return { ...state.job };
}

export function resetJobs(): void {
  jobs.clear();
}
