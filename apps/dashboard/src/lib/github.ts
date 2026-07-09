// GitHub, spoken through plain fetch — the same shape as the Vercel calls in
// executor.ts, no SDK. A repo-backed lead's site source lives here: the
// executor reads blobs on demand, commits its edits once, and lets the repo's
// own Vercel integration build the result.

const GITHUB_API = "https://api.github.com";

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface TreeEntry {
  path: string;
  sha: string;
  size: number;
  /** Files the executor may not read: too big, or a binary/vendored path. */
  readable: boolean;
}

export interface RepoTree {
  headSha: string;
  entries: TreeEntry[];
}

/** Directories whose contents are build output, dependencies, or vendored. */
const EXCLUDED_PREFIXES = [
  "node_modules/",
  ".git/",
  ".next/",
  "dist/",
  "build/",
  "out/",
  ".vercel/",
  "coverage/",
  ".turbo/",
];

const EXCLUDED_NAMES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
]);

/** Extensions the executor can meaningfully read and edit as text. */
const TEXT_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "css",
  "scss",
  "md",
  "mdx",
  "html",
  "svg",
  "txt",
  "yml",
  "yaml",
  "toml",
]);

const TEXT_FILENAMES = new Set(["Dockerfile", ".env.example", ".gitignore"]);

/** A blob past this size would swamp the model's context; list, never read. */
const MAX_READABLE_BYTES = 200_000;
/** A repo this large is not a small business site — fail loudly, don't guess. */
const MAX_TREE_ENTRIES = 500;

/**
 * The env var holding the token for one owner: `Go-Nutz` → `GITHUB_TOKEN_GO_NUTZ`.
 */
export function tokenEnvKey(owner: string): string {
  return `GITHUB_TOKEN_${owner.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

/**
 * A fine-grained PAT reaches exactly one account or organisation, so each owner
 * brings its own token and `GITHUB_TOKEN` is only the fallback. Sharing one
 * token across owners silently half-works: it reads a repo it cannot write.
 */
export function githubToken(owner: string): string | undefined {
  return process.env[tokenEnvKey(owner)] ?? process.env.GITHUB_TOKEN;
}

function ghHeaders(owner: string): Record<string, string> {
  const token = githubToken(owner);
  if (!token) {
    throw new Error(`no GitHub token for ${owner} — set ${tokenEnvKey(owner)} or GITHUB_TOKEN`);
  }
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "phillip-dashboard",
  };
}

async function gh<T>(owner: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...ghHeaders(owner), ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `github ${init?.method ?? "GET"} ${path} failed (${res.status}): ${detail.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

// GitHub's own charset, minus the bare dot segments — `..` would otherwise
// travel up the API path when interpolated into /repos/{owner}/{repo}.
const SEGMENT = /^[\w.-]+$/;
const isSegment = (s: string) => SEGMENT.test(s) && s !== "." && s !== "..";

/**
 * Accepts what a human would paste: a browser URL, a clone URL, `owner/repo`,
 * or a bare repo name resolved against GITHUB_OWNER.
 */
export function parseRepo(input: string): RepoRef | null {
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/^git@github\.com:/, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  s = s.replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  // Drop anything past owner/repo — /tree/main, /blob/..., query strings.
  s = s.split(/[?#]/)[0];

  const parts = s.split("/").filter(Boolean);
  const [owner, repo] =
    parts.length >= 2 ? [parts[0], parts[1]] : [process.env.GITHUB_OWNER ?? "", parts[0] ?? ""];

  if (!owner || !repo || !isSegment(owner) || !isSegment(repo)) return null;
  return { owner, repo };
}

/** The canonical form stored on the lead — one repo, one string. */
export function repoUrl(ref: RepoRef): string {
  return `https://github.com/${ref.owner}/${ref.repo}`;
}

export function repoLabel(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`;
}

export async function getRepoInfo(ref: RepoRef): Promise<{ defaultBranch: string }> {
  const repo = await gh<{ default_branch: string }>(ref.owner, `/repos/${ref.owner}/${ref.repo}`);
  return { defaultBranch: repo.default_branch };
}

function isReadable(path: string, size: number): boolean {
  if (size > MAX_READABLE_BYTES) return false;
  const name = path.split("/").pop() ?? "";
  if (TEXT_FILENAMES.has(name)) return true;
  const ext = name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
  return TEXT_EXTENSIONS.has(ext);
}

function isExcluded(path: string): boolean {
  if (EXCLUDED_NAMES.has(path.split("/").pop() ?? "")) return true;
  return EXCLUDED_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

/** The repo's file list at branch HEAD — paths and sizes only, no contents. */
export async function listTree(ref: RepoRef, branch: string): Promise<RepoTree> {
  const head = await gh<{ commit: { sha: string; commit: { tree: { sha: string } } } }>(
    ref.owner,
    `/repos/${ref.owner}/${ref.repo}/branches/${encodeURIComponent(branch)}`,
  );
  const tree = await gh<{
    truncated: boolean;
    tree: { path: string; type: string; sha: string; size?: number }[];
  }>(
    ref.owner,
    `/repos/${ref.owner}/${ref.repo}/git/trees/${head.commit.commit.tree.sha}?recursive=1`,
  );

  if (tree.truncated) {
    throw new Error("repo tree is too large to read in one pass");
  }

  const entries: TreeEntry[] = tree.tree
    .filter((t) => t.type === "blob" && !isExcluded(t.path))
    .map((t) => ({
      path: t.path,
      sha: t.sha,
      size: t.size ?? 0,
      readable: isReadable(t.path, t.size ?? 0),
    }));

  if (entries.length > MAX_TREE_ENTRIES) {
    throw new Error(`repo has ${entries.length} source files — too many for an inline iteration`);
  }
  return { headSha: head.commit.sha, entries };
}

export async function getBlobText(ref: RepoRef, sha: string): Promise<string> {
  const blob = await gh<{ content: string; encoding: string }>(
    ref.owner,
    `/repos/${ref.owner}/${ref.repo}/git/blobs/${sha}`,
  );
  if (blob.encoding !== "base64") return blob.content;
  return Buffer.from(blob.content, "base64").toString("utf-8");
}

export interface FileChange {
  path: string;
  /** null deletes the file. */
  content: string | null;
}

/**
 * One commit, many files, via the Git Data API: build a tree on top of the
 * current head, commit it, move the branch. A concurrent push makes the ref
 * update fail as non-fast-forward — rebuild on the new head and try once more.
 */
export async function commitFiles(input: {
  ref: RepoRef;
  branch: string;
  message: string;
  changes: FileChange[];
}): Promise<{ commitSha: string }> {
  const { ref, branch, message, changes } = input;
  if (changes.length === 0) throw new Error("commitFiles called with no changes");
  const base = `/repos/${ref.owner}/${ref.repo}`;

  const attempt = async (): Promise<string> => {
    const refRow = await gh<{ object: { sha: string } }>(
      ref.owner,
      `${base}/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    const headSha = refRow.object.sha;
    const headCommit = await gh<{ tree: { sha: string } }>(
      ref.owner,
      `${base}/git/commits/${headSha}`,
    );

    const tree = await gh<{ sha: string }>(ref.owner, `${base}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: changes.map((c) =>
          c.content === null
            ? { path: c.path, mode: "100644", type: "blob", sha: null }
            : { path: c.path, mode: "100644", type: "blob", content: c.content },
        ),
      }),
    });

    const commit = await gh<{ sha: string }>(ref.owner, `${base}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] }),
    });

    await gh(ref.owner, `${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    return commit.sha;
  };

  try {
    return { commitSha: await attempt() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Someone pushed between our read and our ref update. Rebuild once.
    if (!/\(422\)/.test(msg)) throw err;
    return { commitSha: await attempt() };
  }
}
