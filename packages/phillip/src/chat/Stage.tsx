import { AnimatePresence, m, useReducedMotion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { useViewportInset } from "../lib/useViewportInset";
import {
  containerVariants,
  itemVariants,
  panelVariants,
  press,
  tapTransition,
} from "../overlay/motion";
import type { Persona } from "../types/boot";
import { Close } from "../ui/icons";

// The frameless conversation stage. No card, header, or border — just a
// bottom-right region that anchors the floating transcript and a footer
// (composer / quick replies / sub-flow card) over the vignette. A single small
// glass × is the only chrome, so the lead can dismiss back to the bubble.
//
// `footerKey` lets the footer cross-fade (blur + stagger) as the active flow
// swaps — chat → iteration → checkout → setup all animate seamlessly.
// The top fade only exists once content actually scrolls behind it — at the
// very top the first message must be fully readable, so the stronger mask is
// gated behind a `.scrolled` class.
const toggleScrolled = (el: HTMLElement) => {
  el.classList.toggle("scrolled", el.scrollTop > 8);
};

export function Stage({
  persona,
  onClose,
  children,
  footer,
  footerKey = "chat",
  stageRef,
  enterDelay = 0,
}: {
  persona: Persona;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  footerKey?: string;
  /** Lets the widget measure the stage box for the takeover morph. */
  stageRef?: Ref<HTMLDivElement>;
  enterDelay?: number;
}) {
  const reduce = useReducedMotion() ?? false;
  // The soft keyboard paints over anything anchored to the bottom of the
  // viewport. Ride above it — `bottom` is untouched by motion's transforms.
  const keyboard = useViewportInset();
  return (
    <m.div
      ref={stageRef}
      className="stage"
      style={keyboard ? { bottom: keyboard + 12 } : undefined}
      // biome-ignore lint/a11y/useSemanticElements: a floating chat surface, not a modal <dialog>
      role="dialog"
      aria-label={`chat with ${persona.name}`}
      variants={panelVariants(reduce, enterDelay)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.button
        type="button"
        className="stage-close"
        onClick={onClose}
        aria-label="close"
        variants={itemVariants(reduce)}
        whileTap={press}
        transition={tapTransition}
      >
        <Close size={15} />
      </m.button>
      <div className="stage-scroll" onScroll={(e) => toggleScrolled(e.currentTarget)}>
        {children}
      </div>
      {footer ? (
        <div className="stage-footer">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={footerKey}
              className="footer-swap"
              variants={containerVariants(reduce)}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {footer}
            </m.div>
          </AnimatePresence>
        </div>
      ) : null}
    </m.div>
  );
}
