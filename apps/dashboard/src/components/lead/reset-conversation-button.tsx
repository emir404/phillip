"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetConversationAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Wipes the thread so the visitor's next page load starts from Phillip's
// greeting again. Analytics and orders survive — only the chat goes.
export function ResetConversationButton({
  leadId,
  messageCount,
  silenced,
}: {
  leadId: string;
  messageCount: number;
  /** A paid/live lead boots silent, so a cleared thread never comes back. */
  silenced: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  if (messageCount === 0) {
    return (
      <Button variant="outline" size="xs" disabled>
        Reset
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span className="inline-flex" />}>
        <Button variant="outline" size="xs">
          Reset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset conversation?</DialogTitle>
          <DialogDescription>
            This permanently deletes{" "}
            {messageCount === 1 ? "the one message" : `all ${messageCount} messages`} in this
            thread. Events, engagement score, iterations and orders are untouched. There is no undo.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {silenced
            ? "This lead has paid, so the widget no longer mounts on their site — the thread will not come back."
            : "Phillip greets the visitor again the next time they load the page."}
        </p>
        <DialogFooter>
          <DialogClose render={<span className="inline-flex" />}>
            <Button variant="outline" size="sm" disabled={pending}>
              Keep it
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const res = await resetConversationAction(leadId);
              setPending(false);
              if (res.ok) {
                toast.success(
                  res.removed === 1 ? "1 message cleared." : `${res.removed} messages cleared.`,
                );
                setOpen(false);
                router.refresh();
              } else {
                toast.error(res.error);
              }
            }}
          >
            {pending ? "Resetting…" : "Reset conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
