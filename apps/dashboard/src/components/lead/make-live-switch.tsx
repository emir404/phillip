"use client";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { makeLiveAction } from "@/lib/actions";
import { useState } from "react";
import { toast } from "sonner";

export function MakeLiveSwitch({
  leadId,
  isLive,
  orderPaid,
}: {
  leadId: string;
  isLive: boolean;
  orderPaid: boolean;
}) {
  const [pending, setPending] = useState(false);
  const disabled = !orderPaid || isLive || pending;

  const control = (
    <span className="inline-flex">
      <Switch
        checked={isLive}
        disabled={disabled}
        aria-label="Make the site live"
        onCheckedChange={async (next) => {
          if (!next || isLive) return;
          setPending(true);
          const res = await makeLiveAction(leadId);
          setPending(false);
          if (res.ok) toast.success("Site flipped live — stage advanced.");
          else toast.error(res.error);
        }}
      />
    </span>
  );

  if (orderPaid) return control;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{control}</TooltipTrigger>
        <TooltipContent side="left">
          Enabled once the order is paid — the site can't go live before the money lands.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
