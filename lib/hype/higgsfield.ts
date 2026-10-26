/**
 * Minimal fetch-based client for the Higgsfield public API
 * (https://api.higgsfield.ai). Mirrors the official SDK's wire format:
 *   - auth headers `hf-api-key` / `hf-secret`
 *   - POST <endpoint> { params, webhook? } → job set { id, jobs[] }
 *   - GET /v1/job-sets/{id} → { id, jobs: [{ id, status, results: { raw: { url }, min: { url } } }] }
 *   - GET /v1/motions → licensed motion presets
 *   - POST /files/generate-upload-url { content_type } → { upload_url, public_url }
 *
 * We submit WITHOUT blocking and poll from the job worker, so no HTTP request
 * is ever held open waiting for a render.
 */
export interface HfJob { id: string; status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled"; results?: { raw?: { url: string; type?: string }; min?: { url: string; type?: string } } | null }
export interface HfJobSet { id: string; jobs: HfJob[] }
export interface HfMotion { id: string; name: string; description?: string; preview_url?: string }

export class HiggsfieldError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) { super(message); this.name = "HiggsfieldError"; }
}

export function higgsfieldConfigured() {
  return Boolean(process.env.HF_API_KEY && process.env.HF_API_SECRET);
}

export const HF_ENDPOINTS = {
  textToImage: process.env.HIGGSFIELD_TEXT2IMAGE_ENDPOINT || "/v1/text2image/soul",
  imageToVideo: process.env.HIGGSFIELD_IMAGE2VIDEO_ENDPOINT || "/v1/image2video/dop",
  // Genjutsu Light motion transfer. The public path is not documented in the
  // SDK we could verify; confirm the code sample in the Higgsfield console
  // (open.higgsfield.ai) and set HIGGSFIELD_MOTION_TRANSFER_ENDPOINT.
  motionTransfer: process.env.HIGGSFIELD_MOTION_TRANSFER_ENDPOINT || "/v1/video2video/genjutsu-light",
};

export class HiggsfieldApi {
  private base: string;
  private headers: Record<string, string>;
  constructor(opts: { apiKey?: string; apiSecret?: string; baseURL?: string } = {}) {
    const apiKey = opts.apiKey ?? process.env.HF_API_KEY;
    const apiSecret = opts.apiSecret ?? process.env.HF_API_SECRET;
    if (!apiKey || !apiSecret) throw new HiggsfieldError("HF_API_KEY / HF_API_SECRET are not set");
    this.base = (opts.baseURL ?? process.env.HIGGSFIELD_BASE_URL ?? "https://api.higgsfield.ai").replace(/\/$/, "");
    this.headers = { "hf-api-key": apiKey, "hf-secret": apiSecret, "Content-Type": "application/json" };
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { method, headers: this.headers, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    const text = await res.text();
    let data: unknown = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    if (!res.ok) {
      const detail = typeof data === "object" && data && "detail" in data ? JSON.stringify((data as { detail: unknown }).detail) : text.slice(0, 300);
      if (res.status === 403) throw new HiggsfieldError(`Not enough credits or forbidden: ${detail}`, 403, data);
      if (res.status === 401) throw new HiggsfieldError("Invalid Higgsfield credentials", 401, data);
      throw new HiggsfieldError(`Higgsfield ${method} ${path} failed (${res.status}): ${detail}`, res.status, data);
    }
    return data as T;
  }

  /** Submit a generation and return immediately with the job-set id. */
  submit(endpoint: string, params: Record<string, unknown>, webhook?: { url: string; secret: string }) {
    return this.req<HfJobSet>("POST", endpoint, { params, ...(webhook ? { webhook } : {}) });
  }
  status(jobSetId: string) {
    return this.req<HfJobSet>("GET", `/v1/job-sets/${jobSetId}`);
  }
  motions() {
    return this.req<HfMotion[]>("GET", "/v1/motions");
  }
  async upload(data: Buffer | Uint8Array, contentType: string): Promise<string> {
    const { upload_url, public_url } = await this.req<{ upload_url: string; public_url: string }>("POST", "/files/generate-upload-url", { content_type: contentType });
    const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": contentType }, body: new Uint8Array(data) });
    if (!put.ok) throw new HiggsfieldError(`Upload failed (${put.status})`, put.status);
    return public_url;
  }
}

export function summarizeJobSet(js: HfJobSet): { status: HfJob["status"]; url: string | null; thumbnailUrl: string | null } {
  const job = js.jobs?.[0];
  if (!job) return { status: "queued", url: null, thumbnailUrl: null };
  return { status: job.status, url: job.results?.raw?.url ?? null, thumbnailUrl: job.results?.min?.url ?? null };
}

/** Deterministic placeholder used when no provider credentials are configured. */
export function simulatedJobSet(kind: "image" | "video", seed: string): HfJobSet {
  const id = `sim_${kind}_${seed}`;
  return { id, jobs: [{ id, status: "completed", results: { raw: { url: kind === "image" ? "simulated://image" : "simulated://video", type: kind }, min: { url: kind === "image" ? "simulated://image" : "simulated://video" } } }] };
}
