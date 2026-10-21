import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repo, PickInput } from "./repo";
import type {
  Pick, PickPublication, PickSettlement, PickAuditEntry, Profile, Subscription, SubscriptionPlan,
  TrackedBet, Notification, SiteContent, CommunityThread, CommunityPost, BillingEvent,
} from "./types";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { settleUnits } from "@/lib/odds";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function rowToPick(r: Row): Pick {
  return {
    id: r.id,
    sport: r.sport_key,
    league: r.league,
    matchup: r.matchup,
    awayTeam: r.away_team,
    homeTeam: r.home_team,
    startTime: r.start_time,
    betType: r.bet_type,
    selection: r.selection,
    line: r.line,
    odds: num(r.odds),
    stake: num(r.stake),
    sportsbook: r.sportsbook ?? "",
    confidence: r.confidence,
    confidenceNote: r.confidence_note ?? "",
    analysis: r.analysis ?? "",
    keyStats: r.key_stats ?? [],
    status: r.status,
    scheduledFor: r.scheduled_for,
    publishedAt: r.published_at,
    isPremium: r.is_premium,
    isDemo: r.is_demo,
    createdBy: r.created_by ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    result: r.result,
    netUnits: num(r.net_units),
    settledAt: r.settled_at,
    settledBy: r.settled_by,
    settlementNote: r.settlement_note,
    finalScore: r.final_score,
  };
}

function pickToRow(p: Partial<PickInput>): Row {
  const r: Row = {};
  if (p.sport !== undefined) r.sport_key = p.sport;
  if (p.league !== undefined) r.league = p.league;
  if (p.matchup !== undefined) r.matchup = p.matchup;
  if (p.awayTeam !== undefined) r.away_team = p.awayTeam;
  if (p.homeTeam !== undefined) r.home_team = p.homeTeam;
  if (p.startTime !== undefined) r.start_time = p.startTime;
  if (p.betType !== undefined) r.bet_type = p.betType;
  if (p.selection !== undefined) r.selection = p.selection;
  if (p.line !== undefined) r.line = p.line;
  if (p.odds !== undefined) r.odds = p.odds;
  if (p.stake !== undefined) r.stake = p.stake;
  if (p.sportsbook !== undefined) r.sportsbook = p.sportsbook;
  if (p.confidence !== undefined) r.confidence = p.confidence;
  if (p.confidenceNote !== undefined) r.confidence_note = p.confidenceNote;
  if (p.analysis !== undefined) r.analysis = p.analysis;
  if (p.keyStats !== undefined) r.key_stats = p.keyStats;
  if (p.scheduledFor !== undefined) r.scheduled_for = p.scheduledFor;
  if (p.isPremium !== undefined) r.is_premium = p.isPremium;
  if (p.status !== undefined) r.status = p.status;
  return r;
}

const rowToProfile = (r: Row): Profile => ({
  id: r.id, email: r.email, displayName: r.display_name, role: r.role, avatarUrl: r.avatar_url,
  ageVerifiedAt: r.age_verified_at, jurisdiction: r.jurisdiction, createdAt: r.created_at,
});
const rowToSub = (r: Row): Subscription => ({
  id: r.id, userId: r.user_id, planKey: r.plan_key, status: r.status, currentPeriodStart: r.current_period_start,
  currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: r.cancel_at_period_end, provider: r.provider,
  providerSubscriptionId: r.provider_subscription_id, createdAt: r.created_at,
});
const rowToPlan = (r: Row): SubscriptionPlan => ({
  key: r.key, name: r.name, priceCents: r.price_cents, interval: r.interval, intervalCount: r.interval_count,
  tagline: r.tagline ?? "", features: r.features ?? [], highlight: r.highlight, active: r.active,
});
const rowToTracked = (r: Row): TrackedBet => ({
  id: r.id, userId: r.user_id, pickId: r.pick_id, oddsReceived: num(r.odds_received), stakeAmount: num(r.stake_amount),
  sportsbook: r.sportsbook, result: r.result, netAmount: num(r.net_amount), note: r.note, createdAt: r.created_at, updatedAt: r.updated_at,
});
const rowToNotif = (r: Row): Notification => ({
  id: r.id, userId: r.user_id, type: r.type, title: r.title, body: r.body, href: r.href, readAt: r.read_at, createdAt: r.created_at,
});
const rowToBilling = (r: Row): BillingEvent => ({
  id: r.id, userId: r.user_id, type: r.type, amountCents: r.amount_cents, currency: r.currency, description: r.description ?? "", createdAt: r.created_at,
});
const rowToContent = (r: Row): SiteContent => ({
  heroEyebrow: r.hero_eyebrow, heroHeadline: r.hero_headline, heroSubheadline: r.hero_subheadline, primaryCta: r.primary_cta,
  secondaryCta: r.secondary_cta, announcement: r.announcement, promoImageUrl: r.promo_image_url, updatedAt: r.updated_at, updatedBy: r.updated_by ?? "",
});

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function db(): Promise<SupabaseClient> {
  return createClient();
}

export const supabaseRepo: Repo = {
  mode: "supabase",

  async listPublicPicks(f) {
    const sb = await db();
    let q = sb.from("picks").select("*").in("status", ["published", "settled", "voided"]).order("start_time", { ascending: false });
    if (f?.sport && f.sport !== "all") q = q.eq("sport_key", f.sport);
    if (f?.betType && f.betType !== "all") q = q.eq("bet_type", f.betType);
    if (f?.result && f.result !== "all") q = q.eq("result", f.result);
    if (f?.from) q = q.gte("start_time", f.from);
    if (f?.to) q = q.lte("start_time", f.to);
    if (f?.search) q = q.or(`matchup.ilike.%${f.search}%,selection.ilike.%${f.search}%`);
    const { data, error } = await q;
    throwIf(error);
    return (data ?? []).map(rowToPick);
  },
  async listTodaysPicks() {
    const sb = await db();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 86400000);
    const { data, error } = await sb.from("picks").select("*").in("status", ["published", "settled"]).gte("start_time", start.toISOString()).lt("start_time", end.toISOString()).order("start_time");
    throwIf(error);
    return (data ?? []).map(rowToPick);
  },
  async getPick(id) {
    const sb = await db();
    const { data } = await sb.from("picks").select("*").eq("id", id).maybeSingle();
    return data ? rowToPick(data) : null;
  },
  async getPickHistory(id) {
    const sb = await db();
    const [pubs, sets, aud] = await Promise.all([
      sb.from("pick_publications").select("*").eq("pick_id", id).order("revision"),
      sb.from("pick_settlements").select("*").eq("pick_id", id).order("settled_at"),
      sb.from("pick_audit_log").select("*").eq("pick_id", id).order("created_at"),
    ]);
    return {
      publications: (pubs.data ?? []).map((r: Row): PickPublication => ({ id: r.id, pickId: r.pick_id, revision: r.revision, snapshot: rowToPick(r.snapshot) as PickPublication["snapshot"], publishedAt: r.published_at, publishedBy: r.published_by ?? "", reason: r.reason })),
      settlements: (sets.data ?? []).map((r: Row): PickSettlement => ({ id: r.id, pickId: r.pick_id, result: r.result, netUnits: num(r.net_units), finalScore: r.final_score, note: r.note, settledAt: r.settled_at, settledBy: r.settled_by ?? "", supersededBy: r.superseded_by })),
      audit: (aud.data ?? []).map((r: Row): PickAuditEntry => ({ id: r.id, pickId: r.pick_id, action: r.action, actorId: r.actor_id ?? "", actorName: r.actor_name ?? "", before: r.before, after: r.after, reason: r.reason, createdAt: r.created_at })),
    };
  },

  async listAllPicks() {
    const sb = await db();
    const { data, error } = await sb.from("picks").select("*").order("start_time", { ascending: false });
    throwIf(error);
    return (data ?? []).map(rowToPick);
  },
  async createPick(input, actor) {
    const sb = await db();
    const { data, error } = await sb.from("picks").insert({ ...pickToRow(input), status: input.status ?? "draft", created_by: actor.id }).select("*").single();
    throwIf(error);
    await sb.from("pick_audit_log").insert({ pick_id: data.id, action: "created", actor_id: actor.id, actor_name: actor.name, after: { selection: input.selection, odds: input.odds, stake: input.stake } });
    return rowToPick(data);
  },
  async updateUnpublishedPick(id, patch, actor) {
    const sb = await db();
    const { data, error } = await sb.from("picks").update(pickToRow(patch)).eq("id", id).is("published_at", null).select("*").single();
    throwIf(error);
    await sb.from("pick_audit_log").insert({ pick_id: id, action: "updated", actor_id: actor.id, actor_name: actor.name, after: patch });
    return rowToPick(data);
  },
  async publishPick(id) {
    const sb = await db();
    const { data, error } = await sb.rpc("publish_pick", { p_pick_id: id });
    throwIf(error);
    return rowToPick(data);
  },
  async schedulePick(id, scheduledFor, actor) {
    const sb = await db();
    const { data, error } = await sb.from("picks").update({ status: "scheduled", scheduled_for: scheduledFor }).eq("id", id).is("published_at", null).select("*").single();
    throwIf(error);
    await sb.from("pick_audit_log").insert({ pick_id: id, action: "scheduled", actor_id: actor.id, actor_name: actor.name, after: { scheduledFor } });
    return rowToPick(data);
  },
  async settlePick(id, input) {
    const sb = await db();
    const { data, error } = await sb.rpc("settle_pick", { p_pick_id: id, p_result: input.result, p_final_score: input.finalScore ?? null, p_note: input.note ?? null });
    throwIf(error);
    return rowToPick(data);
  },
  async correctSettlement(id, input) {
    const sb = await db();
    const { data, error } = await sb.rpc("correct_settlement", { p_pick_id: id, p_result: input.result, p_reason: input.reason, p_final_score: input.finalScore ?? null });
    throwIf(error);
    return rowToPick(data);
  },
  async voidPick(id, reason, actor) {
    const sb = await db();
    const { data, error } = await sb.from("picks").update({ status: "voided", result: "void", net_units: 0, settlement_note: reason }).eq("id", id).select("*").single();
    throwIf(error);
    await sb.from("pick_audit_log").insert({ pick_id: id, action: "voided", actor_id: actor.id, actor_name: actor.name, reason });
    return rowToPick(data);
  },
  async releaseScheduledPicks() {
    const sb = createAdminClient();
    const { data, error } = await sb.rpc("release_scheduled_picks");
    throwIf(error);
    return (data ?? []).map(rowToPick);
  },

  async getProfile(userId) {
    const sb = await db();
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data ? rowToProfile(data) : null;
  },
  async listProfiles() {
    const sb = await db();
    const { data } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(rowToProfile);
  },
  async updateProfile(userId, patch) {
    const sb = await db();
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.ageVerifiedAt !== undefined) row.age_verified_at = patch.ageVerifiedAt;
    if (patch.jurisdiction !== undefined) row.jurisdiction = patch.jurisdiction;
    if (patch.role !== undefined) row.role = patch.role;
    const { data, error } = await sb.from("profiles").update(row).eq("id", userId).select("*").single();
    throwIf(error);
    return rowToProfile(data);
  },
  async getActiveSubscription(userId) {
    const sb = await db();
    const { data } = await sb.from("subscriptions").select("*").eq("user_id", userId).in("status", ["active", "trialing"]).gt("current_period_end", new Date().toISOString()).order("current_period_end", { ascending: false }).limit(1).maybeSingle();
    return data ? rowToSub(data) : null;
  },
  async listSubscriptions() {
    const sb = await db();
    const { data } = await sb.from("subscriptions").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(rowToSub);
  },
  async listPlans() {
    const sb = await db();
    const { data } = await sb.from("subscription_plans").select("*").order("price_cents");
    return (data ?? []).map(rowToPlan);
  },
  async updatePlan(key, patch) {
    const sb = await db();
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.priceCents !== undefined) row.price_cents = patch.priceCents;
    if (patch.tagline !== undefined) row.tagline = patch.tagline;
    if (patch.features !== undefined) row.features = patch.features;
    if (patch.highlight !== undefined) row.highlight = patch.highlight;
    if (patch.active !== undefined) row.active = patch.active;
    const { data, error } = await sb.from("subscription_plans").update(row).eq("key", key).select("*").single();
    throwIf(error);
    return rowToPlan(data);
  },
  async upsertSubscription(sub) {
    const sb = createAdminClient();
    const row: Row = {
      user_id: sub.userId, plan_key: sub.planKey, status: sub.status, current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd, cancel_at_period_end: sub.cancelAtPeriodEnd, provider: sub.provider,
      provider_subscription_id: sub.providerSubscriptionId ?? null,
    };
    if (sub.id) row.id = sub.id;
    const { data, error } = await sb.from("subscriptions").upsert(row, { onConflict: sub.providerSubscriptionId ? "provider_subscription_id" : "id" }).select("*").single();
    throwIf(error);
    return rowToSub(data);
  },
  async cancelSubscription(userId, atPeriodEnd) {
    const sb = await db();
    const current = await supabaseRepo.getActiveSubscription(userId);
    if (!current) return null;
    const admin = createAdminClient();
    const patch = atPeriodEnd ? { cancel_at_period_end: true } : { status: "canceled", current_period_end: new Date().toISOString() };
    const { data, error } = await admin.from("subscriptions").update(patch).eq("id", current.id).select("*").single();
    throwIf(error);
    void sb;
    return rowToSub(data);
  },
  async listBillingEvents(userId) {
    const sb = await db();
    let q = sb.from("billing_events").select("*").order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    const { data } = await q;
    return (data ?? []).map(rowToBilling);
  },
  async addBillingEvent(ev) {
    const sb = createAdminClient();
    const { data, error } = await sb.from("billing_events").insert({ user_id: ev.userId, type: ev.type, amount_cents: ev.amountCents, currency: ev.currency, description: ev.description }).select("*").single();
    throwIf(error);
    return rowToBilling(data);
  },

  async listTrackedBets(userId) {
    const sb = await db();
    const { data } = await sb.from("user_tracked_bets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map(rowToTracked);
  },
  async upsertTrackedBet(bet) {
    const sb = await db();
    const net = bet.result === "pending" ? 0 : settleUnits(bet.result, bet.oddsReceived, bet.stakeAmount);
    const row: Row = { user_id: bet.userId, pick_id: bet.pickId, odds_received: bet.oddsReceived, stake_amount: bet.stakeAmount, sportsbook: bet.sportsbook, result: bet.result, net_amount: net, note: bet.note ?? null, updated_at: new Date().toISOString() };
    if (bet.id) row.id = bet.id;
    const { data, error } = await sb.from("user_tracked_bets").upsert(row, { onConflict: "user_id,pick_id" }).select("*").single();
    throwIf(error);
    return rowToTracked(data);
  },
  async deleteTrackedBet(userId, id) {
    const sb = await db();
    await sb.from("user_tracked_bets").delete().eq("id", id).eq("user_id", userId);
  },

  async listNotifications(userId) {
    const sb = await db();
    const { data } = await sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    return (data ?? []).map(rowToNotif);
  },
  async markNotificationsRead(userId, ids) {
    const sb = await db();
    let q = sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    if (ids) q = q.in("id", ids);
    await q;
  },
  async broadcastNotification(n, audience) {
    const sb = createAdminClient();
    let userIds: string[] = [];
    if (audience === "all") {
      const { data } = await sb.from("profiles").select("id");
      userIds = (data ?? []).map((r: Row) => r.id);
    } else {
      const { data } = await sb.from("subscriptions").select("user_id").in("status", ["active", "trialing"]).gt("current_period_end", new Date().toISOString());
      userIds = [...new Set((data ?? []).map((r: Row) => r.user_id as string))];
    }
    if (!userIds.length) return 0;
    const { error } = await sb.from("notifications").insert(userIds.map((user_id) => ({ user_id, type: n.type, title: n.title, body: n.body, href: n.href ?? null })));
    throwIf(error);
    return userIds.length;
  },
  async getNotificationPreferences(userId) {
    const sb = await db();
    const { data } = await sb.from("notification_preferences").select("*, profiles!inner(email)").eq("user_id", userId).maybeSingle();
    const profile = await supabaseRepo.getProfile(userId);
    if (!data) return { userId, email: profile?.email ?? null, newPicks: true, upcomingGames: false, settledResults: true, renewals: true, pushEnabled: false };
    return { userId, email: profile?.email ?? null, newPicks: data.new_picks, upcomingGames: data.upcoming_games, settledResults: data.settled_results, renewals: data.renewals, pushEnabled: data.push_enabled };
  },
  async updateNotificationPreferences(userId, patch) {
    const sb = await db();
    const current = await supabaseRepo.getNotificationPreferences(userId);
    const next = { ...current, ...patch };
    const { error } = await sb.from("notification_preferences").upsert({ user_id: userId, new_picks: next.newPicks, upcoming_games: next.upcomingGames, settled_results: next.settledResults, renewals: next.renewals, push_enabled: next.pushEnabled });
    throwIf(error);
    return next;
  },

  async getSiteContent() {
    const sb = await db();
    const { data } = await sb.from("site_content").select("*").eq("id", 1).single();
    return rowToContent(data ?? {});
  },
  async updateSiteContent(patch, actor) {
    const sb = await db();
    const row: Row = { updated_at: new Date().toISOString(), updated_by: actor.id };
    if (patch.heroEyebrow !== undefined) row.hero_eyebrow = patch.heroEyebrow;
    if (patch.heroHeadline !== undefined) row.hero_headline = patch.heroHeadline;
    if (patch.heroSubheadline !== undefined) row.hero_subheadline = patch.heroSubheadline;
    if (patch.primaryCta !== undefined) row.primary_cta = patch.primaryCta;
    if (patch.secondaryCta !== undefined) row.secondary_cta = patch.secondaryCta;
    if (patch.announcement !== undefined) row.announcement = patch.announcement;
    if (patch.promoImageUrl !== undefined) row.promo_image_url = patch.promoImageUrl;
    const { data, error } = await sb.from("site_content").update(row).eq("id", 1).select("*").single();
    throwIf(error);
    return rowToContent(data);
  },

  async listThreads() {
    const sb = await db();
    const { data } = await sb.from("community_threads").select("*, profiles(display_name), community_posts(count)").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    return (data ?? []).map((r: Row): CommunityThread => ({ id: r.id, authorId: r.author_id, authorName: r.profiles?.display_name ?? "Member", title: r.title, body: r.body, sport: r.sport_key, pinned: r.pinned, locked: r.locked, createdAt: r.created_at, replyCount: r.community_posts?.[0]?.count ?? 0 }));
  },
  async getThread(id) {
    const sb = await db();
    const { data: t } = await sb.from("community_threads").select("*, profiles(display_name)").eq("id", id).maybeSingle();
    if (!t) return null;
    const { data: posts } = await sb.from("community_posts").select("*, profiles(display_name)").eq("thread_id", id).order("created_at");
    return {
      thread: { id: t.id, authorId: t.author_id, authorName: t.profiles?.display_name ?? "Member", title: t.title, body: t.body, sport: t.sport_key, pinned: t.pinned, locked: t.locked, createdAt: t.created_at, replyCount: posts?.length ?? 0 },
      posts: (posts ?? []).map((p: Row): CommunityPost => ({ id: p.id, threadId: p.thread_id, authorId: p.author_id, authorName: p.profiles?.display_name ?? "Member", body: p.body, hidden: p.hidden, createdAt: p.created_at })),
    };
  },
  async createThread(input, actor) {
    const sb = await db();
    const { data, error } = await sb.from("community_threads").insert({ author_id: actor.id, title: input.title, body: input.body, sport_key: input.sport ?? null }).select("*").single();
    throwIf(error);
    return { id: data.id, authorId: actor.id, authorName: actor.name, title: data.title, body: data.body, sport: data.sport_key, pinned: false, locked: false, createdAt: data.created_at, replyCount: 0 };
  },
  async createPost(threadId, body, actor) {
    const sb = await db();
    const { data, error } = await sb.from("community_posts").insert({ thread_id: threadId, author_id: actor.id, body }).select("*").single();
    throwIf(error);
    return { id: data.id, threadId, authorId: actor.id, authorName: actor.name, body, hidden: false, createdAt: data.created_at };
  },
  async moderatePost(postId, hidden) {
    const sb = await db();
    await sb.from("community_posts").update({ hidden }).eq("id", postId);
  },
};
