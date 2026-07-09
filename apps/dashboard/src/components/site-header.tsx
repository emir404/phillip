"use client";

import { useBreadcrumbTitle } from "@/components/breadcrumb-title";
import { ExportMenu } from "@/components/export-menu";
import { LiveIndicator } from "@/components/live-leads";
import { NewLeadDialog } from "@/components/new-lead-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type Crumb = { label: string; href?: string };

function crumbsFor(pathname: string, leadTitle: string | null): Crumb[] {
  if (pathname === "/") return [{ label: "Overview" }];
  if (pathname === "/leads") return [{ label: "Leads" }];
  if (pathname.startsWith("/leads/"))
    return [{ label: "Leads", href: "/leads" }, { label: leadTitle ?? "Lead" }];
  if (pathname.startsWith("/iterations")) return [{ label: "Iterations" }];
  if (pathname.startsWith("/settings")) return [{ label: "Settings" }];
  return [];
}

export function SiteHeader() {
  const pathname = usePathname();
  const leadTitle = useBreadcrumbTitle();
  const crumbs = crumbsFor(pathname, leadTitle);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background/85 px-4 backdrop-blur-md">
      <SidebarTrigger className="relative -ml-1.5 after:absolute after:-inset-1.5" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="max-w-48 truncate">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-3">
        <LiveIndicator className="max-md:hidden" />
        <ExportMenu />
        <NewLeadDialog />
      </div>
    </header>
  );
}
