import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Cookie-presence gate for the team dashboard. Embed-facing /v1 routes are
// excluded below — they run on lead-site origins where the capability is the
// unguessable prv_/ses_ id, not a cookie. Key-gated routes (/v1/previews,
// /v1/ingest) enforce x-api-key inside the handler.
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") {
      url.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/stripe|v1/preview/|v1/previews|v1/events|v1/conversations|v1/iterations|v1/escalations|v1/checkout|v1/ingest|phillip\\.js|_next|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|js|css|map|txt|webmanifest)$).*)",
  ],
};
