import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Node mock for vitest — the same handlers, so the contract is defined once.
export const server = setupServer(...handlers);
