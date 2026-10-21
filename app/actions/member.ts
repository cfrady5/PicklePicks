"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, actorOf, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const trackedSchema = z.object({
  id: z.string().optional(),
  pickId: z.string().min(1),
  oddsReceived: z.coerce.number().int().refine((n) => n <= -100 || n >= 100, "American odds must be ≤ -100 or ≥ +100"),
  stakeAmount: z.coerce.number().min(0, "Stake must be 0 or more").max(1_000_000),
  sportsbook: z.string().max(60).default(""),
  result: z.enum(["pending", "win", "loss", "push", "void"]),
  note: z.string().max(500).optional(),
});

export async function saveTrackedBet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/tracker");
  const parsed = trackedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await getRepo().upsertTrackedBet({ id: d.id || undefined, userId: user.id, pickId: d.pickId, oddsReceived: d.oddsReceived, stakeAmount: d.stakeAmount, sportsbook: d.sportsbook, result: d.result, note: d.note ?? null });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tracker");
  revalidatePath("/dashboard/analytics");
  return { ok: true };
}

export async function deleteTrackedBet(formData: FormData) {
  const user = await requireUser("/dashboard/tracker");
  const id = String(formData.get("id") ?? "");
  if (id) await getRepo().deleteTrackedBet(user.id, id);
  revalidatePath("/dashboard/tracker");
}

export async function markAllRead() {
  const user = await requireUser("/dashboard/notifications");
  await getRepo().markNotificationsRead(user.id);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function updatePreferences(formData: FormData) {
  const user = await requireUser("/dashboard/notifications");
  const on = (k: string) => formData.get(k) === "on";
  await getRepo().updateNotificationPreferences(user.id, { newPicks: on("newPicks"), upcomingGames: on("upcomingGames"), settledResults: on("settledResults"), renewals: on("renewals"), pushEnabled: on("pushEnabled") });
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?saved=1");
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/settings");
  const parsed = z.object({ displayName: z.string().min(2).max(40), jurisdiction: z.string().max(60).optional(), ageConfirm: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await getRepo().updateProfile(user.id, {
    displayName: parsed.data.displayName,
    jurisdiction: parsed.data.jurisdiction || null,
    ...(parsed.data.ageConfirm === "on" && !user.ageVerifiedAt ? { ageVerifiedAt: new Date().toISOString() } : {}),
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function createThread(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/community");
  const ent = await getEntitlement();
  if (!ent.isSubscriber) return { error: "The community is for active members." };
  const parsed = z.object({ title: z.string().min(4).max(120), body: z.string().min(4).max(4000), sport: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = await getRepo().createThread({ title: parsed.data.title, body: parsed.data.body, sport: parsed.data.sport || null }, actorOf(user));
  revalidatePath("/dashboard/community");
  redirect(`/dashboard/community/${t.id}`);
}

export async function replyToThread(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/community");
  const ent = await getEntitlement();
  if (!ent.isSubscriber) return { error: "The community is for active members." };
  const parsed = z.object({ threadId: z.string().min(1), body: z.string().min(2).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await getRepo().createPost(parsed.data.threadId, parsed.data.body, actorOf(user));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/dashboard/community/${parsed.data.threadId}`);
  return { ok: true };
}

export async function moderatePost(formData: FormData) {
  const user = await requireUser("/dashboard/community");
  if (user.role !== "admin") return;
  const id = String(formData.get("postId"));
  const hidden = formData.get("hidden") === "true";
  await getRepo().moderatePost(id, hidden);
  revalidatePath(`/dashboard/community/${String(formData.get("threadId"))}`);
}
