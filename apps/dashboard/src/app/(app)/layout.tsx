import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbProvider } from "@/components/breadcrumb-title";
import { LiveLeadsProvider } from "@/components/live-leads";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getLeads } from "@/lib/store";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

// The authenticated shell. Cookie presence is enforced by src/proxy.ts before
// any of these routes render. The layout seeds the app-wide live-leads poll
// from the store (no HTTP round-trip on first paint) and restores the
// sidebar's collapsed state from the cookie the primitive writes.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const leads = await getLeads();

  return (
    <LiveLeadsProvider initialLeads={leads}>
      <BreadcrumbProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <MotionProvider>
              <div className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
                {children}
              </div>
            </MotionProvider>
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbProvider>
    </LiveLeadsProvider>
  );
}
