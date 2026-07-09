"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { eventLabel, relativeTime } from "@/lib/analytics";
import { notableFeed } from "@/lib/trends";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import { m, useReducedMotion } from "motion/react";
import Link from "next/link";

function initialsOf(business: string) {
  const parts = business.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : business.slice(0, 2)).toUpperCase();
}

// The cross-lead pulse: the latest conversation/funnel moments, each linking
// straight into the lead it belongs to.
export function ActivityFeed({
  leads,
  className,
}: {
  leads: DashboardLead[];
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const items = notableFeed(leads, 8);

  return (
    <Card className={cn("h-full", className)} aria-label="Latest activity">
      <CardHeader>
        <CardTitle>Latest</CardTitle>
        <CardDescription>Notable moments across the book</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        {items.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">
            phillip is watching — moments land here live.
          </p>
        ) : (
          <m.div
            className="flex flex-col"
            variants={container(reduce, 0.05)}
            initial="initial"
            animate="animate"
          >
            {items.map((f) => (
              <m.div key={f.id} variants={item(reduce)}>
                <Item
                  size="sm"
                  render={<Link href={`/leads/${f.leadId}`} />}
                  className="rounded-lg hover:bg-muted/60"
                >
                  <ItemMedia>
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-brand/10 text-[11px] font-semibold text-brand dark:bg-brand/18 dark:text-brand-start">
                        {initialsOf(f.business)}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="flex w-full items-baseline gap-2">
                      <span className="truncate">{f.business}</span>
                      <span
                        className="ml-auto shrink-0 text-xs font-normal text-muted-foreground tabular-nums"
                        suppressHydrationWarning
                      >
                        {relativeTime(f.ts)}
                      </span>
                    </ItemTitle>
                    <ItemDescription className="truncate">
                      {eventLabel(f.label)}
                      {f.detail ? (
                        <span className="text-muted-foreground/70"> · {f.detail}</span>
                      ) : null}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </m.div>
            ))}
          </m.div>
        )}
      </CardContent>
    </Card>
  );
}
