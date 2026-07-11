import type {
  Attachment,
  ChangeItem,
  ChangeKind,
  ChangeSet,
  ElementTarget,
} from "../types/records";

// The guided options Phillip offers for an inline tweak. Each maps to a light
// ChangeKind the Build agent can turn around without a human.
export interface IterationOption {
  id: string;
  label: string;
  kind: ChangeKind;
  target?: string;
  value?: string;
}

export const ITERATION_OPTIONS: IterationOption[] = [
  { id: "warmer", label: "warmer palette", kind: "palette", value: "warmer" },
  { id: "cooler", label: "cooler palette", kind: "palette", value: "cooler" },
  { id: "punchier_headline", label: "punchier headline", kind: "headline" },
  { id: "tighten_copy", label: "tighten the copy", kind: "copy" },
  { id: "swap_hero", label: "swap the hero photo", kind: "photo_swap", target: "hero" },
  { id: "reorder_sections", label: "reorder sections", kind: "section_reorder" },
  { id: "fix_hours", label: "fix the hours", kind: "hours" },
  { id: "fix_contact", label: "update contact info", kind: "contact" },
];

// After this many inline rounds without converging, escalate (SPEC.md round cap).
export const MAX_INLINE_ROUNDS = 3;

/** Structure the selected guided options + free text (+ a picked element,
 *  when the lead pointed at one, + any attached photos/files) into a change-set. */
export function captureChangeSet(
  selected: IterationOption[],
  freeText?: string,
  target?: ElementTarget,
  attachments?: Attachment[],
): ChangeSet {
  const items: ChangeItem[] = selected.map((o) => ({
    kind: o.kind,
    target: o.target,
    value: o.value,
  }));
  const ft = freeText?.trim();
  return {
    items,
    freeText: ft ? ft : undefined,
    target,
    attachments: attachments?.length ? attachments : undefined,
  };
}

// The light/heavy boundary. Guided options are always light; only the free-text
// ask can push a request over the line into "bring in the email agent".
const HEAVY_RE =
  /\b(new page|add (a |another )?page|booking|reserv|menu with|e-?commerce|online store|shop|cart|checkout flow|integrat|api|login|sign[- ]?up|account|multi-?page|custom feature|database|payment|crm)\b/;

export function isHeavyRequest(changeSet: ChangeSet): boolean {
  return Boolean(changeSet.freeText && HEAVY_RE.test(changeSet.freeText.toLowerCase()));
}
