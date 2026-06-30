import { log } from "../lib/log";

export type FetchLike = typeof fetch;

export interface RestOptions {
  baseUrl: string;
  fetch?: FetchLike;
  headers?: Record<string, string>;
  retries?: number;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function backoff(attempt: number): number {
  return Math.min(300 * 2 ** attempt, 4000);
}

// Typed fetch with a small backoff retry on network errors and 5xx. 4xx is
// returned as-is (a non-ok Response) so callers can decide.
export class Rest {
  private readonly fetchImpl: FetchLike;
  private readonly retries: number;

  constructor(private readonly opts: RestOptions) {
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.retries = opts.retries ?? 2;
  }

  private url(path: string): string {
    return `${this.opts.baseUrl}${path}`;
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = this.url(path);
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          ...init,
          headers: {
            ...this.opts.headers,
            ...(init.headers as Record<string, string> | undefined),
          },
        });
        if (res.status >= 500 && attempt < this.retries) {
          log.debug("retrying after 5xx", { url, attempt, status: res.status });
          await sleep(backoff(attempt));
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
        if (attempt < this.retries) {
          log.debug("retrying after network error", { url, attempt });
          await sleep(backoff(attempt));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(`request failed: ${url}`);
  }

  async getJson<T>(path: string): Promise<T> {
    const res = await this.request(path, { method: "GET" });
    if (!res.ok) throw new HttpError(res.status, this.url(path));
    return (await res.json()) as T;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new HttpError(res.status, this.url(path));
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async postVoid(path: string, body: unknown): Promise<void> {
    const res = await this.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new HttpError(res.status, this.url(path));
  }
}
