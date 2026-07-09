"use client";

import { Button } from "@/components/ui/button";
import { markEscalationHandledAction, markIterationDoneAction } from "@/lib/actions";
import { useState } from "react";
import { toast } from "sonner";

// Tiny one-shot action buttons for list rows. The server actions revalidate
// the affected paths, so the surrounding server components re-render on success.

export function MarkIterationDoneButton({ iterationId }: { iterationId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await markIterationDoneAction(iterationId);
        setPending(false);
        if (res.ok) toast.success("Iteration marked done.");
        else toast.error(res.error);
      }}
    >
      {pending ? "Saving…" : "Mark done"}
    </Button>
  );
}

export function MarkEscalationHandledButton({
  escalationId,
  leadId,
}: {
  escalationId: string;
  leadId: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await markEscalationHandledAction(escalationId, leadId);
        setPending(false);
        if (res.ok) toast.success("Escalation handled.");
        else toast.error(res.error);
      }}
    >
      {pending ? "Saving…" : "Mark handled"}
    </Button>
  );
}
