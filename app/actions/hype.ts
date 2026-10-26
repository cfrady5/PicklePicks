"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getHypeStore } from "@/lib/hype/store";
import { startHypeForPick, advanceJob, retryHypeJob, cancelHypeJob } from "@/lib/hype/pipeline";
import { SPORTS } from "@/lib/constants";
import type { SportKey } from "@/lib/constants";

export type HypeActionState = { error?: string; ok?: boolean } | undefined;

export async function generateHypeForPick(formData: FormData) {
  const admin = await requireAdmin();
  const pickId = String(formData.get("pickId") ?? "");
  const job = await startHypeForPick(pickId, admin.id);
  after(async () => { try { await advanceJob(job.id, { budgetMs: 240_000 }); } catch (e) { console.error("[hype] advance failed", e); } });
  revalidatePath("/admin/hype");
  redirect(`/admin/hype/${job.id}`);
}

export async function advanceHypeNow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await advanceJob(id, { budgetMs: 40_000 });
  revalidatePath(`/admin/hype/${id}`);
}

export async function retryHype(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await retryHypeJob(id);
  after(async () => { try { await advanceJob(id, { budgetMs: 240_000 }); } catch (e) { console.error("[hype] advance failed", e); } });
  revalidatePath(`/admin/hype/${id}`);
}

export async function cancelHype(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await cancelHypeJob(id);
  revalidatePath(`/admin/hype/${id}`);
}

const sportKeys = SPORTS.map((s) => s.key);

export async function addMemeReference(_prev: HypeActionState, formData: FormData): Promise<HypeActionState> {
  await requireAdmin();
  const parsed = z.object({
    title: z.string().min(2).max(120),
    videoUrl: z.string().url().startsWith("https://", "Must be an https URL"),
    durationSec: z.coerce.number().int().min(1).max(15),
    tags: z.string().default(""),
    sports: z.string().default(""),
    mood: z.string().max(40).default(""),
    licenseNote: z.string().min(5, "Record how you are licensed to reuse this clip").max(500),
    source: z.string().max(200).default(""),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await getHypeStore().addReference({
    title: d.title, videoUrl: d.videoUrl, durationSec: d.durationSec, aspect: "9:16",
    tags: d.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    sports: d.sports.split(",").map((s) => s.trim().toUpperCase()).filter((s): s is SportKey => (sportKeys as string[]).includes(s)),
    mood: d.mood.toLowerCase(), licenseNote: d.licenseNote, source: d.source, active: true,
  });
  revalidatePath("/admin/hype");
  return { ok: true };
}

export async function toggleMemeReference(formData: FormData) {
  await requireAdmin();
  await getHypeStore().setReferenceActive(String(formData.get("id")), formData.get("active") === "true");
  revalidatePath("/admin/hype");
}
