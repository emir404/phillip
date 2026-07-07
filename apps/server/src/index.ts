import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import type { ChangeSet } from "@nutz/phillip";
import cors from "cors";
import express from "express";
import { getAsset, storeAsset } from "./assets";
import { DEMO_CONTEXT, demoBootConfig } from "./fixtures";
import { prefixedId } from "./id";
import { advanceJob, createJob } from "./jobs";
import { streamPhillipReply } from "./reply";
import { getSite } from "./site";
import { resolveQuickReply } from "./store";

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Missing ANTHROPIC_API_KEY. Copy apps/server/.env.example to apps/server/.env and set it, then restart.",
  );
  process.exit(1);
}

const anthropic = new Anthropic();

const app = express();
app.use(cors());
// Raised from the 100kb default — attachments arrive as base64 data URLs
// (client-side downscaled, but base64 still runs ~33% larger than raw bytes).
app.use(express.json({ limit: "8mb" }));

app.get("/v1/preview/:id/boot", (req, res) => {
  res.json(demoBootConfig(req.params.id));
});

app.post("/v1/events", (_req, res) => {
  res.status(204).end();
});

app.post("/v1/conversations/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const { message, quickReplyId } = req.body as { message?: string; quickReplyId?: string };
  const userText = message ?? (quickReplyId ? resolveQuickReply(sessionId, quickReplyId) : "");

  await streamPhillipReply({
    anthropic,
    model: MODEL,
    res,
    sessionId,
    conversationId: prefixedId("conv"),
    ctx: DEMO_CONTEXT,
    userText,
  });
});

app.post("/v1/iterations", (req, res) => {
  const { previewId, changeSet } = req.body as { previewId: string; changeSet: ChangeSet };
  const changeRequest = changeSet?.freeText?.trim() ?? "";
  const attachments = changeSet?.attachments ?? [];
  if (!changeRequest && attachments.length === 0) {
    res.status(400).json({ error: "changeSet.freeText or an attachment is required" });
    return;
  }
  const attachmentUrls = attachments.map((a) => {
    const assetId = storeAsset(a.dataUrl);
    return `${req.protocol}://${req.get("host")}/v1/preview/${encodeURIComponent(previewId)}/assets/${assetId}`;
  });
  res.json(createJob(anthropic, MODEL, previewId, changeRequest, attachmentUrls));
});

app.get("/v1/iterations/:id", (req, res) => {
  const job = advanceJob(req.params.id);
  if (!job) {
    res.status(404).end();
    return;
  }
  res.json(job);
});

app.get("/v1/preview/:id/site", (req, res) => {
  res.json(getSite(req.params.id));
});

app.get("/v1/preview/:id/assets/:assetId", (req, res) => {
  const asset = getAsset(req.params.assetId);
  if (!asset) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", asset.mediaType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(asset.bytes);
});

app.post("/v1/escalations", (_req, res) => {
  res.json({ ok: true });
});

app.post("/v1/checkout", (_req, res) => {
  res.json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_demo" });
});

app.listen(PORT, () => {
  console.log(`phillip server (live, model=${MODEL}) on http://localhost:${PORT}`);
});
