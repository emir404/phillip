"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ArrowsClockwise, GearSix, List, SignOut, SquaresFour } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Overview", icon: SquaresFour },
  { href: "/iterations", label: "Iterations", icon: ArrowsClockwise },
  { href: "/settings", label: "Settings", icon: GearSix },
] as const;

function Wordmark() {
  return (
    <span className="flex items-baseline gap-1.5 text-sm">
      <span className="font-semibold tracking-tight text-sidebar-foreground">phillip</span>
      <span className="text-muted-foreground">· nutz</span>
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon size={17} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await authClient.signOut();
        } finally {
          window.location.href = "/login";
        }
      }}
    >
      <SignOut />
    </Button>
  );
}

// Desktop rail — hidden below md.
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center px-4">
        <Wordmark />
      </div>
      <div className="flex-1 px-3 py-2">
        <NavLinks />
      </div>
      <div className="flex items-center justify-between border-t px-3 py-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}

// Mobile top bar with a sheet menu — hidden at md and up.
export function MobileBar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation" />}>
          <List />
        </SheetTrigger>
        <SheetContent side="left" className="bg-sidebar">
          <SheetHeader>
            <SheetTitle>
              <Wordmark />
            </SheetTitle>
          </SheetHeader>
          <div className="px-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-auto flex items-center justify-between border-t px-3 py-3">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </SheetContent>
      </Sheet>
      <Wordmark />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
