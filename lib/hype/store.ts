import { isDemoMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { uid } from "@/lib/utils";
import type { HypeJob, MemeReference } from "./types";

export interface HypeStore {
  readonly mode: "demo" | "supabase";
  createJob(job: Omit<HypeJob, "id" | "createdAt" | "updatedAt">): Promise<HypeJob>;
  getJob(id: string): Promise<HypeJob | null>;
  saveJob(job: HypeJob): Promise<HypeJob>;
  listJobs(opts?: { pickId?: string; limit?: number; active?: boolean }): Promise<HypeJob[]>;
  listReferences(): Promise<MemeReference[]>;
  addReference(ref: Omit<MemeReference, "id" | "createdAt">): Promise<MemeReference>;
  setReferenceActive(id: string, active: boolean): Promise<void>;
  /** Best-effort worker lock so two advances don't double-submit paid work. Returns true if acquired. */
  tryLock(id: string, ms: number): Promise<boolean>;
  unlock(id: string): Promise<void>;
  /** Persist a binary asset and return a public https URL (or an app-served URL in demo mode). */
  putAsset(key: string, data: Buffer, contentType: string): Promise<string>;
  getAsset(key: string): Promise<{ data: Buffer; contentType: string } | null>;
}

const ACTIVE = new Set(["queued", "running", "waiting_provider"]);

/* ---------------- demo (in-memory) ---------------- */
interface DemoState { jobs: HypeJob[]; refs: MemeReference[]; assets: Map<string, { data: Buffer; contentType: string }>; locks: Map<string, number> }
const g = globalThis as unknown as { __ppHype?: DemoState };
const demo = (): DemoState => (g.__ppHype ??= { jobs: [], refs: [], assets: new Map(), locks: new Map() });
const now = () => new Date().toISOString();

export const demoHypeStore: HypeStore = {
  mode: "demo",
  async createJob(job) {
    const j: HypeJob = { ...job, id: uid("hype"), createdAt: now(), updatedAt: now() };
    demo().jobs.unshift(j);
    return structuredClone(j);
  },
  async getJob(id) { const j = demo().jobs.find((x) => x.id === id); return j ? structuredClone(j) : null; },
  async saveJob(job) {
    const s = demo();
    const i = s.jobs.findIndex((x) => x.id === job.id);
    const next = { ...job, updatedAt: now() };
    if (i >= 0) s.jobs[i] = next; else s.jobs.unshift(next);
    return structuredClone(next);
  },
  async listJobs(opts = {}) {
    let list = demo().jobs;
    if (opts.pickId) list = list.filter((j) => j.pickId === opts.pickId);
    if (opts.active) list = list.filter((j) => ACTIVE.has(j.status));
    return structuredClone(list.slice(0, opts.limit ?? 50));
  },
  async listReferences() { return structuredClone(demo().refs); },
  async addReference(ref) { const r: MemeReference = { ...ref, id: uid("ref"), createdAt: now() }; demo().refs.unshift(r); return structuredClone(r); },
  async setReferenceActive(id, active) { const r = demo().refs.find((x) => x.id === id); if (r) r.active = active; },
  async tryLock(id, ms) {
    const locks = demo().locks; const until = locks.get(id) ?? 0;
    if (until > Date.now()) return false;
    locks.set(id, Date.now() + ms); return true;
  },
  async unlock(id) { demo().locks.delete(id); },
  async putAsset(key, data, contentType) {
    demo().assets.set(key, { data, contentType });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return `${base}/api/hype/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
  },
  async getAsset(key) { return demo().assets.get(key) ?? null; },
};

/* ---------------- supabase ---------------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
const rowToJob = (r: any): HypeJob => ({ ...(r.data as HypeJob), id: r.id, pickId: r.pick_id, status: r.status, step: r.step, mode: r.mode, capUsd: Number(r.cap_usd), reservedUsd: Number(r.reserved_usd), spentUsd: Number(r.spent_usd), error: r.error, createdBy: r.created_by ?? "", createdAt: r.created_at, updatedAt: r.updated_at });
const jobToRow = (j: HypeJob) => ({ pick_id: j.pickId, status: j.status, step: j.step, mode: j.mode, cap_usd: j.capUsd, reserved_usd: j.reservedUsd, spent_usd: j.spentUsd, error: j.error ?? null, created_by: j.createdBy || null, data: j, updated_at: new Date().toISOString() });
const rowToRef = (r: any): MemeReference => ({ id: r.id, title: r.title, videoUrl: r.video_url, durationSec: r.duration_sec, aspect: "9:16", tags: r.tags ?? [], sports: r.sports ?? [], mood: r.mood ?? "", licenseNote: r.license_note ?? "", source: r.source ?? "", active: r.active, createdAt: r.created_at });

export const supabaseHypeStore: HypeStore = {
  mode: "supabase",
  async createJob(job) {
    const sb = createAdminClient();
    const { data, error } = await sb.from("hype_jobs").insert(jobToRow({ ...job, id: "", createdAt: "", updatedAt: "" } as HypeJob)).select("*").single();
    if (error) throw new Error(error.message);
    return rowToJob(data);
  },
  async getJob(id) { const sb = createAdminClient(); const { data } = await sb.from("hype_jobs").select("*").eq("id", id).maybeSingle(); return data ? rowToJob(data) : null; },
  async saveJob(job) {
    const sb = createAdminClient();
    const { data, error } = await sb.from("hype_jobs").update(jobToRow(job)).eq("id", job.id).select("*").single();
    if (error) throw new Error(error.message);
    return rowToJob(data);
  },
  async listJobs(opts = {}) {
    const sb = createAdminClient();
    let q = sb.from("hype_jobs").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 50);
    if (opts.pickId) q = q.eq("pick_id", opts.pickId);
    if (opts.active) q = q.in("status", [...ACTIVE]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToJob);
  },
  async listReferences() { const sb = createAdminClient(); const { data } = await sb.from("meme_references").select("*").order("created_at", { ascending: false }); return (data ?? []).map(rowToRef); },
  async addReference(ref) {
    const sb = createAdminClient();
    const { data, error } = await sb.from("meme_references").insert({ title: ref.title, video_url: ref.videoUrl, duration_sec: ref.durationSec, tags: ref.tags, sports: ref.sports, mood: ref.mood, license_note: ref.licenseNote, source: ref.source, active: ref.active }).select("*").single();
    if (error) throw new Error(error.message);
    return rowToRef(data);
  },
  async setReferenceActive(id, active) { const sb = createAdminClient(); await sb.from("meme_references").update({ active }).eq("id", id); },
  async tryLock(id, ms) {
    const sb = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await sb.from("hype_jobs").update({ lock_until: new Date(Date.now() + ms).toISOString() }).eq("id", id).or(`lock_until.is.null,lock_until.lt.${nowIso}`).select("id");
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  },
  async unlock(id) { const sb = createAdminClient(); await sb.from("hype_jobs").update({ lock_until: null }).eq("id", id); },
  async putAsset(key, data, contentType) {
    const sb = createAdminClient();
    const { error } = await sb.storage.from("hype").upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    return sb.storage.from("hype").getPublicUrl(key).data.publicUrl;
  },
  async getAsset(key) {
    const sb = createAdminClient();
    const { data, error } = await sb.storage.from("hype").download(key);
    if (error || !data) return null;
    return { data: Buffer.from(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
  },
};

export function getHypeStore(): HypeStore {
  return isDemoMode() ? demoHypeStore : supabaseHypeStore;
}
