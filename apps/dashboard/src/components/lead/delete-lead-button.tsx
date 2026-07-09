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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteLeadAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Deleting a lead erases everything — analytics, conversation, orders — and
// takes the preview site offline. Paying customers are protected server-side;
// the disabled state here just says so up front.
export function DeleteLeadButton({
  leadId,
  business,
  paidProtected,
}: {
  leadId: string;
  business: string;
  paidProtected: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  if (paidProtected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button variant="destructive" size="sm" disabled>
              Delete lead
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            This lead has paid — real customers can't be deleted.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span className="inline-flex" />}>
        <Button variant="destructive" size="sm">
          Delete lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {business}?</DialogTitle>
          <DialogDescription>
            This permanently removes the lead with its full conversation, analytics, iterations, and
            orders — and takes the preview site offline. There is no undo.
          </DialogDescription>
        </DialogHeader>
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
              const res = await deleteLeadAction(leadId);
              setPending(false);
              if (res.ok) {
                toast.success(`${business} deleted.`);
                setOpen(false);
                router.push("/leads");
                router.refresh();
              } else {
                toast.error(res.error);
              }
            }}
          >
            {pending ? "Deleting…" : "Delete forever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
