"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { bucketedActivity } from "@/lib/trends";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

const chartConfig = {
  events: { label: "Signals", color: "var(--chart-1)" },
  messages: { label: "Messages", color: "var(--chart-2)" },
} satisfies ChartConfig;

// Book-wide pulse: every signal the embed captured plus every chat message,
// bucketed across whatever span the data actually covers.
export function ActivityChart({
  leads,
  className,
}: {
  leads: DashboardLead[];
  className?: string;
}) {
  const data = bucketedActivity(leads);

  return (
    <Card className={cn("h-full", className)} aria-label="Activity over time">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Signals and messages across every preview</CardDescription>
      </CardHeader>
      <CardContent className="h-full min-h-56">
        {data.length === 0 ? (
          <div className="flex h-full min-h-56 items-center justify-center text-sm text-muted-foreground">
            Signals land here as soon as a preview gets its first visit.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full min-h-56 w-full">
            <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-events)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-events)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-messages)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-messages)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                className="text-xs tabular-nums"
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Area
                dataKey="messages"
                type="monotone"
                fill="url(#fillMessages)"
                stroke="var(--color-messages)"
                strokeWidth={1.5}
                stackId="a"
                isAnimationActive={false}
              />
              <Area
                dataKey="events"
                type="monotone"
                fill="url(#fillEvents)"
                stroke="var(--color-events)"
                strokeWidth={1.5}
                stackId="a"
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
