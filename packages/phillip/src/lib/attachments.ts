import type { Attachment } from "../types/records";

// Images get downscaled client-side before they ever leave the browser — a
// phone photo can be 10MB+ and there's no reason to ship that over the wire
// for what's usually going in a nav bar at ~120px wide. Non-image files (a
// PDF menu, etc.) are just read as-is under a hard size cap, since there's no
// cheap way to "downscale" a document.
const MAX_IMAGE_DIMENSION = 640;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
// Lovable-style attach cap — enough to cover "logo + a couple of extra
// photos" without turning a composer into a file manager. Shared by the
// takeover rail and the floating chat's paperclip.
export const MAX_ATTACHMENTS = 5;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to decode image"));
    img.src = dataUrl;
  });
}

async function downscaleImage(dataUrl: string, mediaType: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  if (scale === 1) return dataUrl; // already small enough, keep original bytes/format

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unsupported (shouldn't happen in a browser) — fall back
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNG keeps transparency, which matters for logos; anything else downgrades
  // to PNG too rather than JPEG's white-background artifacting.
  return canvas.toDataURL(mediaType === "image/png" ? "image/png" : "image/jpeg", 0.85);
}

/**
 * Reads a File into an Attachment, downscaling images so payloads stay
 * small. `url` starts as a `data:` URL — the server swaps it for a real
 * hosted one once the attachment reaches `/v1/iterations`.
 */
export async function readAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    // Callers with access to the lead's language should pre-check size
    // against MAX_ATTACHMENT_BYTES themselves for a localized message (see
    // Takeover.tsx) — this is just a backstop for any other caller.
    throw new Error(`${file.name} is too large (max ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB)`);
  }
  const raw = await readAsDataUrl(file);
  const url = file.type.startsWith("image/") ? await downscaleImage(raw, file.type) : raw;
  return { name: file.name, mediaType: file.type || "application/octet-stream", url };
}
