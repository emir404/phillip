"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowSquareOut, Copy, DownloadSimple, Export } from "@phosphor-icons/react";
import { toast } from "sonner";

// The agent feed lives at /v1/export — this menu hands it to whoever needs it:
// a URL for downstream build agents, JSON for a quick look, NDJSON for piping.
export function ExportMenu() {
  async function copyFeedUrl() {
    const url = `${window.location.origin}/v1/export`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Agent feed URL copied");
    } catch {
      toast.error("Couldn't copy — is clipboard access blocked?");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" aria-label="Export agent feed" />}
      >
        <Export data-icon="inline-start" />
        <span className="max-sm:hidden">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Agent feed</DropdownMenuLabel>
        <DropdownMenuItem onClick={copyFeedUrl}>
          <Copy />
          Copy feed URL
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open("/v1/export", "_blank", "noopener,noreferrer")}
        >
          <ArrowSquareOut />
          Open JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            const a = document.createElement("a");
            a.href = "/v1/export?format=ndjson";
            a.download = "phillip-agent-feed.ndjson";
            a.click();
          }}
        >
          <DownloadSimple />
          Download NDJSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
