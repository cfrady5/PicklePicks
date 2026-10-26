"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, actorOf } from "@/lib/auth";
import { getRepo, type PickInput } from "@/lib/data";
import { SPORTS, BET_TYPES } from "@/lib/constants";
import { isDemoMode } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, templates } from "@/lib/email";
import { after } from "next/server";
import { HYPE_SETTINGS, startHypeForPick, advanceJob } from "@/lib/hype/pipeline";

function maybeAutoHype(pickId: string, actorId: string) {
  if (!HYPE_SETTINGS.autoOnPublish) return;
  after(async () => {
    try { const job = await startHypeForPick(pickId, actorId); await advanceJob(job.id, { budgetMs: 240_000 }); } catch (e) { console.error("[hype] auto-run failed", e); }
  });
}

export type AdminState = { error?: string; ok?: boolean; id?: string } | undefined;

const sportKeys = SPORTS.map((s) => s.key) as [string, ...string[]];
const betTypeKeys = BET_TYPES.map((b) => b.key) as [string, ...string[]];

const pickSchema = z.object({
  sport: z.enum(sportKeys),
  league: z.string().min(1).max(60),
  awayTeam: z.string().min(1).max(60),
  homeTeam: z.string().min(1).max(60),
  startTime: z.string().min(1, "Start time is required"),
  betType: z.enum(betTypeKeys),
  selection: z.string().min(2).max(140),
  line: z.string().max(30).optional(),
  odds: z.coerce.number().int().refine((n) => n <= -100 || n >= 100, "American odds must be ≤ -100 or ≥ +100"),
  stake: z.coerce.number().min(0.1).max(10),
  sportsbook: z.string().max(40).default(""),
  confidence: z.enum(["lean", "play", "strong"]),
  confidenceNote: z.string().max(500).default("Confidence tiers (Lean / Play / Strong) reflect recommended unit sizing from our internal process. They are not calibrated win probabilities and are not guarantees."),
  analysis: z.string().min(20, "Write at least a couple of sentences of analysis").max(5000),
  keyStats: z.string().optional(),
  isPremium: z.string().optional(),
  scheduledFor: z.string().optional(),
  intent: z.enum(["draft", "schedule", "publish"]).default("draft"),
});

function parseKeyStats(raw?: string) {
  if (!raw?.trim()) return [];
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [label, ...rest] = l.split(":"); return { label: label.trim(), value: rest.join(":").trim() }; }).filter((k) => k.label && k.value).slice(0, 8);
}

function toInput(d: z.infer<typeof pickSchema>): PickInput {
  const sport = SPORTS.find((s) => s.key === d.sport)!;
  const sep = d.sport === "OTHER" ? " vs. " : " @ ";
  return {
    sport: d.sport as PickInput["sport"],
    league: d.league || sport.league,
    matchup: `${d.awayTeam}${sep}${d.homeTeam}`,
    awayTeam: d.awayTeam,
    homeTeam: d.homeTeam,
    startTime: new Date(d.startTime).toISOString(),
    betType: d.betType as PickInput["betType"],
    selection: d.selection,
    line: d.line || null,
    odds: d.odds,
    stake: d.stake,
    sportsbook: d.sportsbook,
    confidence: d.confidence,
    confidenceNote: d.confidenceNote,
    analysis: d.analysis,
    keyStats: parseKeyStats(d.keyStats),
    isPremium: d.isPremium !== "off",
    scheduledFor: d.intent === "schedule" && d.scheduledFor ? new Date(d.scheduledFor).toISOString() : null,
    status: d.intent === "schedule" ? "scheduled" : "draft",
  };
}

function revalidateAll() {
  for (const p of ["/", "/results", "/dashboard", "/dashboard/picks", "/dashboard/history", "/admin", "/admin/picks"]) revalidatePath(p);
}

export async function createPick(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = pickSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.intent === "schedule" && !parsed.data.scheduledFor) return { error: "Choose a release time to schedule." };
  const repo = getRepo();
  let pick = await repo.createPick(toInput(parsed.data), actorOf(admin));
  if (parsed.data.intent === "publish") { pick = await repo.publishPick(pick.id, actorOf(admin)); maybeAutoHype(pick.id, admin.id); }
  revalidateAll();
  redirect(`/admin/picks/${pick.id}?saved=1`);
}

export async function updatePick(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = pickSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const repo = getRepo();
  try {
    await repo.updateUnpublishedPick(id, toInput(parsed.data), actorOf(admin));
    if (parsed.data.intent === "publish") { await repo.publishPick(id, actorOf(admin)); maybeAutoHype(id, admin.id); }
    else if (parsed.data.intent === "schedule" && parsed.data.scheduledFor) await repo.schedulePick(id, new Date(parsed.data.scheduledFor).toISOString(), actorOf(admin));
  } catch (e) { return { error: (e as Error).message }; }
  revalidateAll();
  revalidatePath(`/admin/picks/${id}`);
  return { ok: true };
}

export async function publishPickNow(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await getRepo().publishPick(id, actorOf(admin));
  maybeAutoHype(id, admin.id);
  revalidateAll();
  revalidatePath(`/admin/picks/${id}`);
}

export async function settlePick(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), result: z.enum(["win", "loss", "push", "void"]), finalScore: z.string().max(40).optional(), note: z.string().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const p = await getRepo().settlePick(parsed.data.id, { result: parsed.data.result, finalScore: parsed.data.finalScore || undefined, note: parsed.data.note || undefined }, actorOf(admin));
    // Best-effort email to subscribers who opted in (Supabase mode uses a batched job in production).
    if (!isDemoMode()) {
      try {
        const repo = getRepo();
        const subs = await repo.listSubscriptions();
        for (const s of subs.filter((x) => x.status === "active")) {
          const prefs = await repo.getNotificationPreferences(s.userId);
          if (prefs.settledResults && prefs.email) await sendEmail({ to: prefs.email, ...templates.settled({ selection: p.selection, result: p.result, net: `${p.netUnits >= 0 ? "+" : ""}${p.netUnits.toFixed(2)}u` }) });
        }
      } catch (e) { console.warn("settlement email failed", e); }
    }
  } catch (e) { return { error: (e as Error).message }; }
  revalidateAll();
  revalidatePath(`/admin/picks/${parsed.data.id}`);
  revalidatePath(`/picks/${parsed.data.id}`);
  return { ok: true };
}

export async function correctSettlement(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), result: z.enum(["win", "loss", "push", "void"]), finalScore: z.string().max(40).optional(), reason: z.string().min(5, "A reason (min 5 chars) is required for corrections").max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try { await getRepo().correctSettlement(parsed.data.id, { result: parsed.data.result, finalScore: parsed.data.finalScore || undefined, reason: parsed.data.reason }, actorOf(admin)); } catch (e) { return { error: (e as Error).message }; }
  revalidateAll();
  revalidatePath(`/admin/picks/${parsed.data.id}`);
  revalidatePath(`/picks/${parsed.data.id}`);
  return { ok: true };
}

export async function voidPick(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), reason: z.string().min(5, "A reason is required").max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await getRepo().voidPick(parsed.data.id, parsed.data.reason, actorOf(admin));
  revalidateAll();
  revalidatePath(`/admin/picks/${parsed.data.id}`);
  return { ok: true };
}

export async function updateSiteContent(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = z.object({ heroEyebrow: z.string().min(1).max(60), heroHeadline: z.string().min(1).max(120), heroSubheadline: z.string().min(1).max(400), primaryCta: z.string().min(1).max(40), secondaryCta: z.string().min(1).max(40), announcement: z.string().max(200).optional(), promoImageUrl: z.string().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await getRepo().updateSiteContent({ ...parsed.data, announcement: parsed.data.announcement || null, promoImageUrl: parsed.data.promoImageUrl || null }, actorOf(admin));
  revalidatePath("/"); revalidatePath("/admin/content");
  return { ok: true };
}

export async function updatePlan(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = z.object({ key: z.string().min(1), name: z.string().min(1).max(40), price: z.coerce.number().min(0).max(10000), tagline: z.string().max(120), features: z.string().max(2000), highlight: z.string().optional(), active: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await getRepo().updatePlan(d.key, { name: d.name, priceCents: Math.round(d.price * 100), tagline: d.tagline, features: d.features.split("\n").map((s) => s.trim()).filter(Boolean), highlight: d.highlight === "on", active: d.active === "on" });
  revalidatePath("/"); revalidatePath("/pricing"); revalidatePath("/admin/content");
  return { ok: true };
}

export async function uploadPromo(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed." };
  if (file.size > 5 * 1024 * 1024) return { error: "Max 5 MB." };
  if (isDemoMode()) {
    // Demo: keep the image inline as a data URL (never persisted).
    const buf = Buffer.from(await file.arrayBuffer());
    const url = `data:${file.type};base64,${buf.toString("base64")}`;
    await getRepo().updateSiteContent({ promoImageUrl: url }, actorOf(admin));
  } else {
    const supabase = createAdminClient(); // admin already verified above
    const path = `promo/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const { error } = await supabase.storage.from("promo").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error: error.message };
    const { data } = supabase.storage.from("promo").getPublicUrl(path);
    await getRepo().updateSiteContent({ promoImageUrl: data.publicUrl }, actorOf(admin));
  }
  revalidatePath("/"); revalidatePath("/admin/content");
  return { ok: true };
}

export async function broadcast(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = z.object({ title: z.string().min(2).max(100), body: z.string().min(2).max(500), href: z.string().max(200).optional(), audience: z.enum(["all", "subscribers"]), type: z.enum(["system", "new_pick", "upcoming_game", "settled", "renewal"]).default("system") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const n = await getRepo().broadcastNotification({ type: parsed.data.type, title: parsed.data.title, body: parsed.data.body, href: parsed.data.href || null }, parsed.data.audience);
  revalidatePath("/dashboard/notifications");
  return { ok: true, id: String(n) };
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) === "admin" ? "admin" : "member";
  if (userId === admin.id) redirect("/admin/users?error=self");
  await getRepo().updateProfile(userId, { role });
  revalidatePath("/admin/users");
}

export async function grantSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  const planKey = String(formData.get("planKey"));
  const days = Number(formData.get("days") ?? 30);
  const repo = getRepo();
  const now = new Date();
  await repo.upsertSubscription({ userId, planKey, status: "active", currentPeriodStart: now.toISOString(), currentPeriodEnd: new Date(now.getTime() + days * 86400000).toISOString(), cancelAtPeriodEnd: true, provider: "manual" });
  await repo.addBillingEvent({ userId, type: "manual.grant", amountCents: 0, currency: "usd", description: `Complimentary ${planKey} access (${days} days)` });
  revalidatePath("/admin/users"); revalidatePath("/admin/subscriptions");
}

export async function adminCancelSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  await getRepo().cancelSubscription(userId, false);
  revalidatePath("/admin/subscriptions"); revalidatePath("/admin/users");
}

export async function releaseScheduled() {
  await requireAdmin();
  const n = await getRepo().releaseScheduledPicks();
  revalidateAll();
  return n.length;
}
