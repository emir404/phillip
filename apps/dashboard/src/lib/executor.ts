import type { ChangeSet } from "@nutz/phillip";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { previews } from "../db/schema";
import { EXECUTOR_MODEL, anthropic, recordModelUsage } from "./anthropic";
import {
  getIteration,
  getLeadRow,
  getSiteFiles,
  insertBackendEvent,
  putSiteFiles,
  updateIteration,
  updateLeadFields,
  updatePreview,
} from "./store";

// The iteration executor: load the lead's site source, have Claude apply the
// requested change set, deploy the result to the lead's Vercel project, and
// mark the iteration done with the fresh URL. Kept behind this single function
// so it can move to a dedicated agent runtime (Eve) later without touching the
// widget, routes, or schema.

const VERCEL_API = "https://api.vercel.com";

interface ToolInput {
  path?: string;
  content?: string;
  summary?: string;
}

const EXECUTOR_TOOLS = [
  {
    name: "write_file",
    description: "Create or fully replace one site file with new content.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path, e.g. index.html" },
        content: { type: "string", description: "The complete new file content." },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Delete one site file.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "finish",
    description: "Call when every requested change has been applied.",
    input_schema: {
      type: "object" as const,
      properties: { summary: { type: "string", description: "One sentence: what changed." } },
      required: ["summary"],
    },
  },
];

const EXECUTOR_SYSTEM = [
  "You are the site editor at nutz. You edit small static websites that were generated for local businesses, applying exactly the changes the customer asked for.",
  "",
  "Rules:",
  "- Apply ONLY the requested changes. Preserve everything else byte-for-byte where possible: structure, copy, links, styles the request doesn't touch.",
  "- NEVER remove or alter <script> tags (especially the phillip embed tag with data-preview-id) or data-section / data-cta / data-gallery / data-contact attributes — analytics depend on them.",
  "- Rewrite whole files via write_file (no diffs). Keep the site self-contained and dependency-free.",
  "- When the request is vague (e.g. 'warmer colors'), make one tasteful, decisive interpretation — small-business friendly, never garish.",
  "- When the request names a target element (a CSS selector the customer picked by clicking their preview), scope the edit to that element and its immediate context — do not restyle lookalikes elsewhere on the page.",
  "- When everything is applied, call finish with a one-sentence summary.",
].join("\n");

function changeSetPrompt(changeSet: ChangeSet, files: { path: string; content: string }[]): string {
  const parts: string[] = ["The customer asked for these changes:"];
  for (const item of changeSet.items ?? []) {
    parts.push(
      `- [${item.kind}]${item.target ? ` target: ${item.target}` : ""}${item.value ? ` value: ${item.value}` : ""}${item.note ? ` note: ${item.note}` : ""}`,
    );
  }
  if (changeSet.freeText) parts.push(`- in their words: "${changeSet.freeText}"`);
  if (changeSet.target) {
    const t = changeSet.target;
    parts.push(
      `- they clicked this exact element in their preview: <${t.tag}> matching \`${t.selector}\`${
        t.text ? ` (visible text: "${t.text}")` : ""
      }${t.section ? ` inside the "${t.section}" section` : ""} — the change is about THIS element.`,
    );
  }
  parts.push("", "Current site files:");
  for (const f of files) {
    parts.push("", `--- ${f.path} ---`, "```", f.content, "```");
  }
  return parts.join("\n");
}

// Re-inject the embed tag if an edit dropped it — the preview must stay wired.
function ensureEmbedTag(original: string, edited: string): string {
  const tag = original.match(/<script[^>]*data-preview-id[^>]*>\s*<\/script>/i)?.[0];
  if (!tag || edited.includes("data-preview-id")) return edited;
  if (edited.includes("</body>")) return edited.replace("</body>", `  ${tag}\n</body>`);
  return `${edited}\n${tag}\n`;
}

async function applyWithClaude(
  leadId: string,
  changeSet: ChangeSet,
  files: { path: string; content: string }[],
): Promise<{ files: Map<string, string>; summary: string }> {
  const working = new Map(files.map((f) => [f.path, f.content] as const));
  const originals = new Map(working);
  const client = anthropic();

  const messages: Parameters<typeof client.messages.stream>[0]["messages"] = [
    { role: "user", content: changeSetPrompt(changeSet, files) },
  ];
  let summary = "changes applied";

  for (let turn = 0; turn < 6; turn++) {
    const runner = client.messages.stream({
      model: EXECUTOR_MODEL,
      max_tokens: 32000,
      system: EXECUTOR_SYSTEM,
      messages,
      tools: EXECUTOR_TOOLS,
    });
    const final = await runner.finalMessage();
    await recordModelUsage(leadId, "iteration", final.model, {
      input_tokens: final.usage.input_tokens,
      output_tokens: final.usage.output_tokens,
    });

    const toolUses = final.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const results: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
    let finished = false;
    for (const block of toolUses) {
      const input = block.input as ToolInput;
      if (block.name === "write_file" && input.path && typeof input.content === "string") {
        const original = originals.get(input.path);
        working.set(
          input.path,
          input.path.endsWith(".html") && original
            ? ensureEmbedTag(original, input.content)
            : input.content,
        );
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `wrote ${input.path}`,
        });
      } else if (block.name === "delete_file" && input.path) {
        working.delete(input.path);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `deleted ${input.path}`,
        });
      } else if (block.name === "finish") {
        summary = input.summary ?? summary;
        finished = true;
        results.push({ type: "tool_result", tool_use_id: block.id, content: "ok" });
      } else {
        results.push({ type: "tool_result", tool_use_id: block.id, content: "unknown tool" });
      }
    }

    if (finished || final.stop_reason !== "tool_use") break;
    messages.push({ role: "assistant", content: final.content });
    messages.push({ role: "user", content: results });
  }

  return { files: working, summary };
}

// PHILLIP_-prefixed in production (Vercel reserves VERCEL_* names for its own
// system env); the plain names still work for local dev.
const vercelToken = () => process.env.PHILLIP_VERCEL_TOKEN ?? process.env.VERCEL_TOKEN;

function vercelUrl(path: string): string {
  const teamId = process.env.PHILLIP_VERCEL_TEAM_ID ?? process.env.VERCEL_TEAM_ID;
  return `${VERCEL_API}${path}${teamId ? `${path.includes("?") ? "&" : "?"}teamId=${teamId}` : ""}`;
}

/** Tear down a lead's preview project (lead deletion). Best-effort — a
 *  missing token or an already-gone project is not an error. */
export async function deleteVercelProject(project: string): Promise<boolean> {
  const token = vercelToken();
  if (!token) return false;
  const res = await fetch(vercelUrl(`/v9/projects/${project}`), {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 404;
}

async function deployToVercel(
  projectName: string,
  files: Map<string, string>,
): Promise<{ deploymentId: string; url: string }> {
  const token = vercelToken();
  if (!token) throw new Error("PHILLIP_VERCEL_TOKEN is not configured");

  const res = await fetch(vercelUrl("/v13/deployments?skipAutoDetectionConfirmation=1"), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      name: projectName,
      project: projectName,
      target: "production",
      files: [...files.entries()].map(([file, data]) => ({ file, data })),
      projectSettings: { framework: null },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`vercel deploy failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const dep = (await res.json()) as { id: string; url: string };

  // Wait until the deployment actually serves.
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const poll = await fetch(vercelUrl(`/v13/deployments/${dep.id}`), {
      headers: { authorization: `Bearer ${token}` },
    });
    const state = ((await poll.json()) as { readyState?: string }).readyState;
    if (state === "READY") return { deploymentId: dep.id, url: dep.url };
    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(`vercel deployment ended in ${state}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("vercel deployment timed out after 120s");
}

export async function runIteration(iterationId: string): Promise<void> {
  const iteration = await getIteration(iterationId);
  if (!iteration || iteration.status !== "queued") return;
  await updateIteration(iterationId, { status: "processing" });

  try {
    const lead = await getLeadRow(iteration.leadId);
    const sources = await getSiteFiles(iteration.leadId);
    if (!lead || sources.length === 0) {
      await updateIteration(iterationId, { status: "queued_manual", statusReason: "no_source" });
      return;
    }

    const { files, summary } = await applyWithClaude(lead.id, iteration.changeSet, sources);

    const [preview] = await db.select().from(previews).where(eq(previews.id, iteration.previewId));
    const nextVersion = (preview?.version ?? 1) + 1;

    let resultUrl: string;
    let deploymentId: string | null = null;
    if (process.env.PHILLIP_DEPLOY_MODE === "off") {
      // Explicit local/test escape hatch: apply + persist edits without a
      // Vercel deploy. The iteration is honest about it via statusReason.
      resultUrl = `${preview?.url || ""}?v=${nextVersion}`;
    } else {
      const projectName = (lead.vercelProjectId ?? `phillip-${lead.id}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      const dep = await deployToVercel(projectName, files);
      deploymentId = dep.deploymentId;
      // Prefer the lead's known URL, else the project's production alias — the
      // deployment-specific URL can sit behind team deployment protection,
      // which a lead must never hit.
      const publicUrl = preview?.url || `https://${projectName}.vercel.app`;
      resultUrl = `${publicUrl}?v=${nextVersion}`;
      if (lead.vercelProjectId !== projectName) {
        await updateLeadFields(lead.id, { vercelProjectId: projectName });
      }
      if (preview && !preview.url) {
        await updatePreview(preview.id, { url: publicUrl });
      }
    }

    await putSiteFiles(
      lead.id,
      [...files.entries()].map(([path, content]) => ({ path, content })),
    );
    if (preview) await updatePreview(preview.id, { version: nextVersion });
    await updateIteration(iterationId, {
      status: "done",
      statusReason: process.env.PHILLIP_DEPLOY_MODE === "off" ? "deploy_skipped" : null,
      resultUrl,
      version: nextVersion,
      deploymentId,
    });
    await insertBackendEvent(lead.id, iteration.sessionId ?? "backend", "iteration_ready", {
      iterationId,
      round: iteration.round,
      version: nextVersion,
      summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`iteration ${iterationId} failed:`, msg);
    await updateIteration(iterationId, {
      status: "failed",
      statusReason: `error:${msg.slice(0, 200)}`,
    });
  }
}
