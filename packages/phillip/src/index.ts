// Public React entry. Tree-shakeable (sideEffects:false) — importing this does
// not mount anything; render <Phillip/> or call mount() to do that.

export { Phillip, Phillip as PreviewAgent } from "./Phillip";
export type { PhillipProps } from "./Phillip";
export { mount } from "./mount";
export type { MountOptions } from "./mount";
// Default engagement tuning — the dashboard's boot route serves this verbatim.
export { DEFAULT_ENGAGEMENT } from "./engagement/weights";
export { defaultGreeting } from "./intent/greeting";
export type * from "./types";
