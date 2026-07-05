import { useEffect, useRef } from "react";
import { type MountOptions, mount } from "./mount";

export interface PhillipProps {
  previewId: string;
  apiBase?: string;
  debug?: boolean;
  /** Injectable fetch (testing); production uses the global. */
  fetch?: MountOptions["fetch"];
}

/**
 * Thin React wrapper. It doesn't render the widget into the host React tree —
 * it imperatively mounts a self-contained shadow-rooted root via `mount()` in
 * an effect, and tears it down on unmount. Renders nothing itself.
 */
export function Phillip(props: PhillipProps): null {
  // fetch is read through a ref so passing an inline fn doesn't remount.
  const fetchRef = useRef(props.fetch);
  fetchRef.current = props.fetch;

  useEffect(() => {
    const dispose = mount({
      previewId: props.previewId,
      apiBase: props.apiBase,
      debug: props.debug,
      fetch: fetchRef.current,
    });
    return dispose;
  }, [props.previewId, props.apiBase, props.debug]);

  return null;
}
