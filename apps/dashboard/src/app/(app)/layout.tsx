import { MobileBar, Sidebar } from "@/components/app-nav";
import { MotionProvider } from "@/components/motion-provider";
import type { ReactNode } from "react";

// The authenticated shell. Cookie presence is enforced by src/proxy.ts before
// any of these routes render; this layout only provides chrome.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <Sidebar />
      <MobileBar />
      <div className="md:pl-56">
        <main className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 md:p-8">{children}</main>
      </div>
    </MotionProvider>
  );
}
