import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Service-worker-based mock for the playground (npm run dev).
export const worker = setupWorker(...handlers);
