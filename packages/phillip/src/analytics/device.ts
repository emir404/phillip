import type { DeviceContext } from "../types/records";

function detectOS(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "unknown";
}

export function detectDevice(): DeviceContext {
  const ua = navigator.userAgent ?? "";
  const type: DeviceContext["type"] = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone/i.test(ua)
      ? "mobile"
      : "desktop";
  return {
    type,
    os: detectOS(ua),
    browser: detectBrowser(ua),
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

export function getReferrer(): string | undefined {
  return document.referrer || undefined;
}
