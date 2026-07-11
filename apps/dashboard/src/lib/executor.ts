import type { ChangeSet } from "@nutz/phillip";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { previews } from "../db/schema";
import { EXECUTOR_MODEL, anthropic, recordModelUsage } from "./anthropic";
import { getAsset } from "./assets";
import {
  type RepoRef,
  type TreeEntry,
  commitFiles,
  getBlobText,
  getRepoInfo,
  listTree,
  parseRepo,
} from "./github";
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
// requested change set, ship the result, and mark the iteration done with the
// fresh URL. Kept behind this single function so it can move to a dedicated
// agent runtime (Eve) later without touching the widget, routes, or schema.
//
// Two kinds of lead:
//   • repo-backed  — source is a GitHub repo (a Next/Vite app). Claude reads
//     files on demand, edits them surgically, and we push one commit; the
//     repo's own Vercel integration builds it and we wait for that deployment.
//   • file-backed  — source is the site_files table (a generated static page).
//     Claude rewrites files, we upload them straight to Vercel.

const VERCEL_API = "https://api.vercel.com";

/** The attribute that wires a preview back to Phillip — losing it blinds us. */
const EMBED_MARKER = "data-preview-id";

// Type shapes borrowed from the client so we never re-model the SDK.
type Client = ReturnType<typeof anthropic>;
type StreamParams = Parameters<Client["messages"]["stream"]>[0];
type Msg = StreamParams["messages"][number];
type ContentBlocks = Exclude<Msg["content"], string>;
type ToolResultBlock = Extract<ContentBlocks[number], { type: "tool_result" }>;

interface ToolInput {
  path?: string;
  content?: string;
  old_str?: string;
  new_str?: string;
  summary?: string;
}

// ---------------------------------------------------------------------------
// Prompt caching
// ---------------------------------------------------------------------------

/** The system prompt + tools are identical on every turn — cache them once. */
function cachedSystem(text: string): StreamParams["system"] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

/**
 * Move the rolling cache breakpoint to the end of the conversation so each
 * turn re-reads everything before it at 0.1x instead of paying full price.
 */
function markCacheBreakpoint(messages: Msg[]): void {
  for (const m of messages) {
    if (typeof m.content === "string") continue;
    for (const block of m.content) {
      const b = block as { cache_control?: unknown };
      if (b.cache_control) b.cache_control = undefined;
    }
  }
  const last = messages[messages.length - 1];
  if (!last || typeof last.content === "string") return;
  const block = last.content[last.content.length - 1] as { cache_control?: unknown } | undefined;
  if (block) block.cache_control = { type: "ephemeral" };
}

// ---------------------------------------------------------------------------
// Editing primitives (shared by both paths)
// ---------------------------------------------------------------------------

const EDIT_FILE_TOOL = {
  name: "edit_file",
  description:
    "Replace one exact, unique snippet of a file. Preferred over write_file — cheaper and safer.",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string" },
      old_str: {
        type: "string",
        description: "Exact text to replace. Must appear exactly once in the file.",
      },
      new_str: { type: "string", description: "Replacement text." },
    },
    required: ["path", "old_str", "new_str"],
  },
};

/** Exactly-one-match replace. Returns the new text, or why it could not apply. */
function applyEdit(
  content: string,
  oldStr: string,
  newStr: string,
): { ok: true; content: string } | { ok: false; error: string } {
  if (oldStr === "") return { ok: false, error: "old_str must not be empty" };
  const first = content.indexOf(oldStr);
  if (first === -1) {
    return {
      ok: false,
      error: "old_str was not found — read_file again and copy the exact text, whitespace included",
    };
  }
  if (content.indexOf(oldStr, first + oldStr.length) !== -1) {
    const count = content.split(oldStr).length - 1;
    return {
      ok: false,
      error: `old_str matches ${count} places — include more surrounding lines so it is unique`,
    };
  }
  return {
    ok: true,
    content: content.slice(0, first) + newStr + content.slice(first + oldStr.length),
  };
}

/** The change the lead asked for, in their words plus whatever they clicked. */
function changeRequestLines(changeSet: ChangeSet): string[] {
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
  if (changeSet.attachments?.length) {
    const plural = changeSet.attachments.length > 1;
    parts.push(
      [
        `- the customer attached ${plural ? "these files" : "this file"} (shown above so you can`,
        "read the content), each already hosted at the URL below. Decide per attachment:",
        "if it CONTAINS site content (a menu, price list, opening hours, a flyer), read it and",
        "update the page's actual copy — items, prices, hours, sections — to match what it says,",
        "transcribing faithfully; don't invent items or prices that aren't in the file. If it IS",
        "the content (a logo, a photo of the place, a dish), insert an <img> tag with that exact",
        "hosted src wherever it belongs, sized sensibly for the spot (e.g. a logo in the nav",
        "should be a fixed height like 32px, not full width) — don't invent a different image.",
        "If the request doesn't say which, infer from the file itself — a photographed menu",
        "means update the menu content, not paste the photo.",
      ].join(" "),
    );
    for (const a of changeSet.attachments) parts.push(`  - ${a.name} (${a.mediaType}): ${a.url}`);
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Attachment content — let the model SEE what the customer sent
// ---------------------------------------------------------------------------

/** Image media types the Messages API accepts as vision blocks. */
const VISION_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/**
 * The hosted attachment URLs in the change set point at rows in the assets
 * table (/v1/assets/:id). Load those bytes back and hand them to the model as
 * real content blocks — images as vision, PDFs as documents — so a
 * photographed menu can rewrite the site's copy instead of just landing as an
 * <img> tag. Unsupported types simply get no block; the URL note still covers
 * them.
 */
async function attachmentContentBlocks(changeSet: ChangeSet): Promise<ContentBlocks> {
  const blocks = [] as unknown as ContentBlocks;
  for (const a of changeSet.attachments ?? []) {
    const id = a.url.split("/").pop();
    if (!id) continue;
    const asset = await getAsset(id).catch(() => undefined);
    if (!asset) continue;
    if (VISION_MEDIA_TYPES.has(asset.mediaType)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: asset.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: asset.bytesBase64,
        },
      });
    } else if (asset.mediaType === "application/pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: asset.bytesBase64 },
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// File-backed path (site_files → direct Vercel upload)
// ---------------------------------------------------------------------------

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
  EDIT_FILE_TOOL,
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
  "- Prefer edit_file for small changes; use write_file to replace a whole file. Keep the site self-contained and dependency-free.",
  "- When the request is vague (e.g. 'warmer colors'), make one tasteful, decisive interpretation — small-business friendly, never garish.",
  "- When the request names a target element (a CSS selector the customer picked by clicking their preview), scope the edit to that element and its immediate context — do not restyle lookalikes elsewhere on the page.",
  "- When everything is applied, call finish with a one-sentence summary.",
].join("\n");

function changeSetPrompt(changeSet: ChangeSet, files: { path: string; content: string }[]): string {
  const parts = changeRequestLines(changeSet);
  parts.push("", "Current site files:");
  for (const f of files) {
    parts.push("", `--- ${f.path} ---`, "```", f.content, "```");
  }
  return parts.join("\n");
}

// Re-inject the embed tag if an edit dropped it — the preview must stay wired.
function ensureEmbedTag(original: string, edited: string): string {
  const tag = original.match(/<script[^>]*data-preview-id[^>]*>\s*<\/script>/i)?.[0];
  if (!tag || edited.includes(EMBED_MARKER)) return edited;
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

  const messages: Msg[] = [
    {
      role: "user",
      content: [
        ...(await attachmentContentBlocks(changeSet)),
        { type: "text", text: changeSetPrompt(changeSet, files) },
      ],
    },
  ];
  let summary = "changes applied";

  for (let turn = 0; turn < 6; turn++) {
    markCacheBreakpoint(messages);
    const runner = client.messages.stream({
      model: EXECUTOR_MODEL,
      max_tokens: 32000,
      // A single-shot rewrite of a small page needs no deliberation budget.
      thinking: { type: "disabled" },
      system: cachedSystem(EXECUTOR_SYSTEM),
      messages,
      tools: EXECUTOR_TOOLS,
    });
    const final = await runner.finalMessage();
    await recordModelUsage(leadId, "iteration", final.model, final.usage);

    const toolUses = final.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const results: ToolResultBlock[] = [];
    let finished = false;
    for (const block of toolUses) {
      const input = block.input as ToolInput;
      const reply = (content: string, isError = false) =>
        results.push({ type: "tool_result", tool_use_id: block.id, content, is_error: isError });

      if (block.name === "write_file" && input.path && typeof input.content === "string") {
        const original = originals.get(input.path);
        working.set(
          input.path,
          input.path.endsWith(".html") && original
            ? ensureEmbedTag(original, input.content)
            : input.content,
        );
        reply(`wrote ${input.path}`);
      } else if (
        block.name === "edit_file" &&
        input.path &&
        typeof input.old_str === "string" &&
        typeof input.new_str === "string"
      ) {
        const current = working.get(input.path);
        if (current === undefined) {
          reply(`no such file: ${input.path}`, true);
        } else {
          const edit = applyEdit(current, input.old_str, input.new_str);
          if (!edit.ok) {
            reply(edit.error, true);
          } else {
            const original = originals.get(input.path);
            working.set(
              input.path,
              input.path.endsWith(".html") && original
                ? ensureEmbedTag(original, edit.content)
                : edit.content,
            );
            reply(`edited ${input.path}`);
          }
        }
      } else if (block.name === "delete_file" && input.path) {
        working.delete(input.path);
        reply(`deleted ${input.path}`);
      } else if (block.name === "finish") {
        summary = input.summary ?? summary;
        finished = true;
        reply("ok");
      } else {
        reply("unknown tool", true);
      }
    }

    if (finished || final.stop_reason !== "tool_use") break;
    messages.push({ role: "assistant", content: final.content });
    messages.push({ role: "user", content: results });
  }

  return { files: working, summary };
}

// ---------------------------------------------------------------------------
// Repo-backed path (GitHub source → commit → the repo's own Vercel build)
// ---------------------------------------------------------------------------

const REPO_TOOLS = [
  {
    name: "list_files",
    description: "List the repository's editable files again, including your edits so far.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "read_file",
    description: "Read one file's current content. Always read before you edit.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  EDIT_FILE_TOOL,
  {
    name: "write_file",
    description: "Create a new file, or fully replace an existing one when an edit won't do.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Delete one file from the repository.",
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

const EXECUTOR_SYSTEM_REPO = [
  "You are the site editor at nutz. You edit the source of a small website — a Next.js or Vite app in a git repository — applying exactly the change the customer asked for. Your edits are committed and deployed straight to their live preview.",
  "",
  "Rules:",
  "- Read before you edit. The first message lists every file; call read_file for the ones that matter.",
  "- Prefer edit_file: replace the smallest unique snippet that does the job. Use write_file only for new files or a genuine full rewrite.",
  "- Apply ONLY the requested change. Leave unrelated code, copy, and styling exactly as it is.",
  "- NEVER remove the Phillip embed script (the tag carrying data-preview-id), and never remove data-section / data-cta / data-gallery / data-contact attributes — analytics depend on them.",
  "- The change must still build: keep imports, exports, JSX, and syntax valid. Don't touch lockfiles, CI config, or dependencies unless the request truly requires it.",
  "- When the customer clicked an element, find the source that renders it by matching the tag, its visible text, and its data-section — class names in the built page are often generated and unreliable.",
  "- When the request is vague (e.g. 'warmer colors'), make one tasteful, decisive interpretation — small-business friendly, never garish.",
  "- When everything is applied, call finish with a one-sentence summary written for the business owner.",
].join("\n");

interface Workspace {
  ref: RepoRef;
  entries: Map<string, TreeEntry>;
  /** Edited or created content; null marks a deletion. */
  overlay: Map<string, string | null>;
  /** Blob text as it exists on the branch, fetched lazily and cached. */
  originals: Map<string, string>;
}

function renderTree(ws: Workspace): string {
  const paths = new Set([...ws.entries.keys(), ...ws.overlay.keys()]);
  const lines: string[] = [];
  for (const path of [...paths].sort()) {
    const edited = ws.overlay.get(path);
    if (edited === null) continue;
    if (typeof edited === "string") {
      lines.push(`${path} · ${edited.length} (edited)`);
      continue;
    }
    const entry = ws.entries.get(path);
    if (!entry) continue;
    lines.push(`${path} · ${entry.size}${entry.readable ? "" : " (not readable)"}`);
  }
  return lines.join("\n");
}

/** The file as it exists on the branch — fetched once, then cached. */
async function loadOriginal(ws: Workspace, path: string): Promise<string | null> {
  const cached = ws.originals.get(path);
  if (cached !== undefined) return cached;
  const entry = ws.entries.get(path);
  if (!entry || !entry.readable) return null;
  const text = await getBlobText(ws.ref, entry.sha);
  ws.originals.set(path, text);
  return text;
}

/** Current content: the pending edit if there is one, else the branch's copy. */
async function readWorkspaceFile(
  ws: Workspace,
  path: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const edited = ws.overlay.get(path);
  if (edited === null) return { ok: false, error: `${path} was deleted earlier in this session` };
  if (typeof edited === "string") return { ok: true, content: edited };

  const entry = ws.entries.get(path);
  if (!entry) return { ok: false, error: `no such file: ${path}` };
  if (!entry.readable) {
    return { ok: false, error: `${path} is not editable (too large, or not a text file)` };
  }
  const text = await loadOriginal(ws, path);
  if (text === null) return { ok: false, error: `could not read ${path}` };
  return { ok: true, content: text };
}

/**
 * A file that ships the embed script must keep it. Rejecting the tool call (and
 * saying why) beats silently re-injecting a tag into someone's JSX.
 */
async function embedGuard(
  ws: Workspace,
  path: string,
  next: string | null,
): Promise<string | null> {
  const entry = ws.entries.get(path);
  if (!entry || !entry.readable) return null;
  const original = await loadOriginal(ws, path);
  if (!original || !original.includes(EMBED_MARKER)) return null;
  if (next?.includes(EMBED_MARKER)) return null;
  return `rejected: ${path} carries the Phillip embed script (${EMBED_MARKER}) — re-apply your change but keep that script tag exactly as it was`;
}

const LOOP_SOFT_MS = 120_000;
const LOOP_HARD_MS = 150_000;

async function editRepoWithClaude(
  leadId: string,
  changeSet: ChangeSet,
  ws: Workspace,
): Promise<{ summary: string }> {
  const client = anthropic();
  const startedAt = Date.now();

  const opening = [
    ...changeRequestLines(changeSet),
    "",
    "Repository files (path · bytes):",
    renderTree(ws),
    "",
    "Read the files you need, then make the change.",
  ].join("\n");

  const messages: Msg[] = [
    {
      role: "user",
      content: [
        ...(await attachmentContentBlocks(changeSet)),
        { type: "text", text: opening },
      ],
    },
  ];
  let summary = "changes applied";

  for (let turn = 0; turn < 12; turn++) {
    markCacheBreakpoint(messages);
    const runner = client.messages.stream({
      model: EXECUTOR_MODEL,
      max_tokens: 16000,
      system: cachedSystem(EXECUTOR_SYSTEM_REPO),
      messages,
      tools: REPO_TOOLS,
    });
    const final = await runner.finalMessage();
    await recordModelUsage(leadId, "iteration", final.model, final.usage);

    const toolUses = final.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const results: ToolResultBlock[] = [];
    let finished = false;

    for (const block of toolUses) {
      const input = block.input as ToolInput;
      const reply = (content: string, isError = false) =>
        results.push({ type: "tool_result", tool_use_id: block.id, content, is_error: isError });

      if (block.name === "list_files") {
        reply(renderTree(ws));
      } else if (block.name === "read_file" && input.path) {
        const read = await readWorkspaceFile(ws, input.path);
        reply(read.ok ? read.content : read.error, !read.ok);
      } else if (
        block.name === "edit_file" &&
        input.path &&
        typeof input.old_str === "string" &&
        typeof input.new_str === "string"
      ) {
        const read = await readWorkspaceFile(ws, input.path);
        if (!read.ok) {
          reply(read.error, true);
        } else {
          const edit = applyEdit(read.content, input.old_str, input.new_str);
          if (!edit.ok) {
            reply(edit.error, true);
          } else {
            const rejection = await embedGuard(ws, input.path, edit.content);
            if (rejection) {
              reply(rejection, true);
            } else {
              ws.overlay.set(input.path, edit.content);
              reply(`edited ${input.path}`);
            }
          }
        }
      } else if (block.name === "write_file" && input.path && typeof input.content === "string") {
        const rejection = await embedGuard(ws, input.path, input.content);
        if (rejection) {
          reply(rejection, true);
        } else {
          ws.overlay.set(input.path, input.content);
          reply(`wrote ${input.path}`);
        }
      } else if (block.name === "delete_file" && input.path) {
        const rejection = await embedGuard(ws, input.path, null);
        if (rejection) {
          reply(rejection, true);
        } else if (!ws.entries.has(input.path) && !ws.overlay.has(input.path)) {
          reply(`no such file: ${input.path}`, true);
        } else {
          ws.overlay.set(input.path, null);
          reply(`deleted ${input.path}`);
        }
      } else if (block.name === "finish") {
        summary = input.summary ?? summary;
        finished = true;
        reply("ok");
      } else {
        reply("unknown tool", true);
      }
    }

    if (finished || final.stop_reason !== "tool_use") break;

    const elapsed = Date.now() - startedAt;
    // The whole iteration shares one 300s serverless invocation with the build
    // that follows, so the edit loop cannot run long.
    if (elapsed > LOOP_HARD_MS) break;
    if (elapsed > LOOP_SOFT_MS) {
      results.push({
        type: "tool_result",
        tool_use_id: toolUses[toolUses.length - 1].id,
        content: "time is nearly up — apply what remains now and call finish",
      });
    }

    messages.push({ role: "assistant", content: final.content });
    messages.push({ role: "user", content: results });
  }

  return { summary };
}

// ---------------------------------------------------------------------------
// Vercel
// ---------------------------------------------------------------------------

// PHILLIP_-prefixed in production (Vercel reserves VERCEL_* names for its own
// system env); the plain names still work for local dev.
const vercelToken = () => process.env.PHILLIP_VERCEL_TOKEN ?? process.env.VERCEL_TOKEN;

function vercelUrl(path: string): string {
  const teamId = process.env.PHILLIP_VERCEL_TEAM_ID ?? process.env.VERCEL_TEAM_ID;
  return `${VERCEL_API}${path}${teamId ? `${path.includes("?") ? "&" : "?"}teamId=${teamId}` : ""}`;
}

interface VercelProject {
  id: string;
  name: string;
  link?: { type?: string; org?: string; repo?: string };
  targets?: { production?: { alias?: string[] } };
}

/** Prefer a custom domain over the *.vercel.app alias — it's what the lead sees. */
function productionUrlOf(project: VercelProject): string | null {
  const aliases = project.targets?.production?.alias ?? [];
  const custom = aliases
    .filter((a) => !a.endsWith(".vercel.app"))
    .sort((a, b) => a.length - b.length);
  const chosen = custom[0] ?? aliases[0];
  return chosen ? `https://${chosen}` : null;
}

/**
 * Find the Vercel project a repo is linked to. Best-effort: without it we can
 * still push the commit, we just can't watch the build.
 */
export async function findVercelProjectByRepo(
  repo: string,
): Promise<{ projectId: string; name: string; productionUrl: string | null } | null> {
  const token = vercelToken();
  if (!token) return null;
  const parsed = parseRepo(repo);
  if (!parsed) return null;

  try {
    const res = await fetch(vercelUrl(`/v9/projects?repoUrl=${encodeURIComponent(repo)}`), {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { projects?: VercelProject[] };
    // The repoUrl filter does the work; matching again guards against a future
    // API that ignores the param and hands back the whole project list.
    const project = (body.projects ?? []).find(
      (p) =>
        p.link?.type === "github" &&
        p.link.org?.toLowerCase() === parsed.owner.toLowerCase() &&
        p.link.repo?.toLowerCase() === parsed.repo.toLowerCase(),
    );
    if (!project) return null;
    return { projectId: project.id, name: project.name, productionUrl: productionUrlOf(project) };
  } catch {
    return null;
  }
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pollUntilReady(
  deploymentId: string,
  token: string,
  deadline: number,
): Promise<string> {
  while (Date.now() < deadline) {
    const poll = await fetch(vercelUrl(`/v13/deployments/${deploymentId}`), {
      headers: { authorization: `Bearer ${token}` },
    });
    const dep = (await poll.json()) as { readyState?: string; url?: string };
    if (dep.readyState === "READY") return dep.url ?? "";
    if (dep.readyState === "ERROR" || dep.readyState === "CANCELED") {
      throw new Error(`build_${dep.readyState.toLowerCase()}`);
    }
    await sleep(2000);
  }
  throw new Error("build_timeout");
}

/** The lead-facing URL of a project — a custom domain when it has one. */
async function vercelProductionUrl(projectId: string): Promise<string | null> {
  const token = vercelToken();
  if (!token) return null;
  try {
    const res = await fetch(vercelUrl(`/v9/projects/${projectId}`), {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return productionUrlOf((await res.json()) as VercelProject);
  } catch {
    return null;
  }
}

/**
 * The host rebuilds on push, so the commit we just made identifies its own
 * deployment — no need to know which project it belongs to. Find it by SHA,
 * wait for the build, and hand back the project it landed in.
 *
 * Only `build_error` / `build_canceled` mean the change failed. Not finding a
 * deployment, or running out of patience, says nothing about the commit — the
 * caller treats those as "shipped, still building".
 */
async function waitForRepoDeployment(
  commitSha: string,
  budgetMs: number,
  projectIdHint?: string | null,
): Promise<{ deploymentId: string; url: string; projectId: string }> {
  const token = vercelToken();
  if (!token) throw new Error("PHILLIP_VERCEL_TOKEN is not configured");

  const started = Date.now();
  const findDeadline = started + Math.min(90_000, budgetMs * 0.4);
  const scope = projectIdHint ? `&projectId=${projectIdHint}` : "";
  let found: { uid: string; projectId: string } | null = null;

  while (Date.now() < findDeadline) {
    const res = await fetch(
      vercelUrl(`/v6/deployments?limit=50&meta-githubCommitSha=${commitSha}${scope}`),
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const body = (await res.json()) as {
        deployments?: {
          uid: string;
          target?: string;
          projectId?: string;
          meta?: { githubCommitSha?: string };
        }[];
      };
      const match = (body.deployments ?? []).find(
        (d) => d.meta?.githubCommitSha === commitSha && d.target === "production" && d.projectId,
      );
      if (match?.projectId) {
        found = { uid: match.uid, projectId: match.projectId };
        break;
      }
    }
    await sleep(3000);
  }

  if (!found) throw new Error("deploy_not_created");

  const url = await pollUntilReady(found.uid, token, started + budgetMs);
  return { deploymentId: found.uid, url, projectId: found.projectId };
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
  const url = await pollUntilReady(dep.id, token, Date.now() + 120_000);
  return { deploymentId: dep.id, url: url || dep.url };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

type Lead = NonNullable<Awaited<ReturnType<typeof getLeadRow>>>;
type Iteration = NonNullable<Awaited<ReturnType<typeof getIteration>>>;

const deployDisabled = () => process.env.PHILLIP_DEPLOY_MODE === "off";

async function runRepoIteration(iteration: Iteration, lead: Lead): Promise<void> {
  const ref = parseRepo(lead.repoUrl ?? "");
  if (!ref) throw new Error(`unparseable repo url: ${lead.repoUrl}`);

  const branch = lead.repoBranch ?? (await getRepoInfo(ref)).defaultBranch;
  const tree = await listTree(ref, branch);
  const ws: Workspace = {
    ref,
    entries: new Map(tree.entries.map((e) => [e.path, e])),
    overlay: new Map(),
    originals: new Map(),
  };

  const startedAt = Date.now();
  const { summary } = await editRepoWithClaude(lead.id, iteration.changeSet, ws);

  if (ws.overlay.size === 0) throw new Error("no_changes");

  const [preview] = await db.select().from(previews).where(eq(previews.id, iteration.previewId));
  const nextVersion = (preview?.version ?? 1) + 1;

  if (deployDisabled()) {
    await updateIteration(iteration.id, {
      status: "done",
      statusReason: "deploy_skipped",
      resultUrl: `${preview?.url || ""}?v=${nextVersion}`,
      version: nextVersion,
    });
    return;
  }

  const { commitSha } = await commitFiles({
    ref,
    branch,
    message: `${summary}\n\nphillip iteration ${iteration.id} (round ${iteration.round})`,
    changes: [...ws.overlay.entries()].map(([path, content]) => ({ path, content })),
  });

  // The commit is the durable half: refresh the page tomorrow and the change is
  // still there. Now wait for the host to rebuild it, which is the half the
  // lead can actually see. A pushed change is never handed back to a human.
  let publicUrl = preview?.url ?? "";
  let deploymentId: string | null = null;
  let statusReason: string | null = null;

  const budget = Math.max(30_000, 285_000 - (Date.now() - startedAt));
  try {
    const dep = await waitForRepoDeployment(commitSha, budget, lead.vercelProjectId);
    deploymentId = dep.deploymentId;

    if (lead.vercelProjectId !== dep.projectId) {
      await updateLeadFields(lead.id, { vercelProjectId: dep.projectId });
    }
    // First build tells us where this lead actually lives.
    if (!publicUrl) {
      publicUrl =
        (await vercelProductionUrl(dep.projectId)) ?? (dep.url ? `https://${dep.url}` : "");
      if (preview && publicUrl) await updatePreview(preview.id, { url: publicUrl });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A broken build is a real failure: the repo moved, the live page didn't.
    if (msg.startsWith("build_error") || msg.startsWith("build_canceled")) throw err;
    // Anything else — no deployment yet, our patience ran out — says nothing
    // about the commit. It landed; the host will finish on its own schedule.
    statusReason = "deploy_unobserved";
  }

  const resultUrl = `${publicUrl}?v=${nextVersion}`;

  if (preview) await updatePreview(preview.id, { version: nextVersion });
  await updateIteration(iteration.id, {
    status: "done",
    statusReason,
    resultUrl,
    version: nextVersion,
    deploymentId,
  });
  await insertBackendEvent(lead.id, iteration.sessionId ?? "backend", "iteration_ready", {
    iterationId: iteration.id,
    round: iteration.round,
    version: nextVersion,
    summary,
    commitSha,
  });
}

async function runFileIteration(iteration: Iteration, lead: Lead): Promise<void> {
  const sources = await getSiteFiles(iteration.leadId);
  if (sources.length === 0) {
    await updateIteration(iteration.id, { status: "queued_manual", statusReason: "no_source" });
    return;
  }

  const { files, summary } = await applyWithClaude(lead.id, iteration.changeSet, sources);

  const [preview] = await db.select().from(previews).where(eq(previews.id, iteration.previewId));
  const nextVersion = (preview?.version ?? 1) + 1;

  let resultUrl: string;
  let deploymentId: string | null = null;
  if (deployDisabled()) {
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
  await updateIteration(iteration.id, {
    status: "done",
    statusReason: deployDisabled() ? "deploy_skipped" : null,
    resultUrl,
    version: nextVersion,
    deploymentId,
  });
  await insertBackendEvent(lead.id, iteration.sessionId ?? "backend", "iteration_ready", {
    iterationId: iteration.id,
    round: iteration.round,
    version: nextVersion,
    summary,
  });
}

export async function runIteration(iterationId: string): Promise<void> {
  const iteration = await getIteration(iterationId);
  if (!iteration || iteration.status !== "queued") return;
  await updateIteration(iterationId, { status: "processing" });

  try {
    const lead = await getLeadRow(iteration.leadId);
    if (!lead) {
      await updateIteration(iterationId, { status: "queued_manual", statusReason: "no_source" });
      return;
    }

    if (lead.repoUrl) await runRepoIteration(iteration, lead);
    else await runFileIteration(iteration, lead);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`iteration ${iterationId} failed:`, msg);
    await updateIteration(iterationId, {
      status: "failed",
      statusReason: `error:${msg.slice(0, 200)}`,
    });
  }
}
