import { log } from "../lib/log";
import { resolveVisitor } from "../lib/storage";
import type { TransportClient } from "../transport";
import type { BootConfig } from "../types/boot";

// Resolve previewId -> everything the embed needs, and fold in the local
// returning-visitor signal (the backend's flag wins if it already knows).
export async function bootEmbed(previewId: string, client: TransportClient): Promise<BootConfig> {
  const visitor = resolveVisitor(Date.now());
  log.debug("visitor", visitor);

  const config = await client.boot(previewId);

  return {
    ...config,
    session: {
      ...config.session,
      returning: config.session.returning || visitor.returning,
    },
  };
}
