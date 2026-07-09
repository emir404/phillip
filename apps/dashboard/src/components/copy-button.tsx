"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "@phosphor-icons/react";
import { type ComponentProps, useState } from "react";
import { toast } from "sonner";

export function CopyButton({
  text,
  label,
  toastMessage,
  variant = "outline",
  size = "sm",
  ...props
}: {
  text: string;
  /** Visible label next to the icon; omit for an icon-only button. */
  label?: string;
  /** When set, a sonner toast confirms the copy. */
  toastMessage?: string;
} & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className" | "aria-label">) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (toastMessage) toast.success(toastMessage);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard is blocked — copy manually instead.");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      aria-label={props["aria-label"] ?? (label ? undefined : "Copy to clipboard")}
      {...props}
    >
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {label ? (copied ? "Copied" : label) : null}
    </Button>
  );
}
