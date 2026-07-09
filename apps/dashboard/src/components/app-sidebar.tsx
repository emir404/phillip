"use client";

import { useLiveLeads } from "@/components/live-leads";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Icon } from "@phosphor-icons/react";
import { ArrowsClockwise, GearSix, SquaresFour, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

type NavItem = {
  label: string;
  href: string;
  icon: Icon;
  // Renders the live lead count next to the item when true.
  leadCount?: boolean;
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Pipeline",
    items: [
      { label: "Overview", href: "/", icon: SquaresFour },
      { label: "Leads", href: "/leads", icon: UsersThree, leadCount: true },
    ],
  },
  {
    title: "Operate",
    items: [
      { label: "Iterations", href: "/iterations", icon: ArrowsClockwise },
      { label: "Settings", href: "/settings", icon: GearSix },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={`flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white [background:var(--gradient-brand)] ${className ?? ""}`}
      aria-hidden
    >
      p
    </span>
  );
}

function SidebarBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip="Overview"
          className="group-data-[collapsible=icon]:p-0!"
          render={<Link href="/" />}
        >
          <BrandMark />
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="font-semibold tracking-tight">phillip</span>
            <span className="text-xs text-muted-foreground">· nutz</span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { leads } = useLiveLeads();

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon weight={active ? "fill" : "regular"} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.leadCount && leads.length > 0 ? (
                        <SidebarMenuBadge className="text-muted-foreground">
                          {leads.length}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
