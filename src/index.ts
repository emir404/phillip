// Public React entry. Tree-shakeable (sideEffects:false) — importing this does
// not mount anything; render <Phillip/> or call mount() to do that.

export { Phillip, Phillip as PreviewAgent } from "./Phillip";
export type { PhillipProps } from "./Phillip";
export { mount } from "./mount";
export type { MountOptions } from "./mount";
export type * from "./types";
