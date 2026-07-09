"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { CaretUpDown, Desktop, Moon, SignOut, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useState } from "react";

function initialsOf(name: string | undefined, email: string | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "";
  if (!source) return "·";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const chars = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return chars.toUpperCase();
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const name = session?.user?.name || undefined;
  const email = session?.user?.email || undefined;

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:p-0!"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-brand/12 text-xs font-semibold text-brand dark:bg-brand/20 dark:text-brand-start">
                {initialsOf(name, email)}
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name ?? "team"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {email ?? "phillip · nutz"}
              </span>
            </span>
            <span className="ml-auto text-muted-foreground" aria-hidden>
              <CaretUpDown />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* Base UI requires GroupLabel to live inside a Menu.Group /
                Menu.RadioGroup, so each label gets its group wrapper. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{email ?? "signed in"}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioItem value="light">
                <Sun />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Desktop />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={signingOut} onClick={signOut}>
              <SignOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
