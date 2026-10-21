import type { Repo, PickFilters, Actor } from "./repo";
import type {
  Pick, PickPublication, PickSettlement, PickAuditEntry, Profile, Subscription, SubscriptionPlan,
  TrackedBet, Notification, NotificationPreferences, SiteContent, CommunityThread, CommunityPost, BillingEvent,
} from "./types";
import {
  DEMO_USERS, DEMO_SUBSCRIPTIONS, DEMO_BILLING, DEMO_NOTIFICATIONS, DEMO_THREADS, DEMO_POSTS, DEMO_CONTENT,
  buildDemoPicks, buildDemoPublications, buildDemoSettlements, buildDemoAudit, buildDemoTrackedBets,
} from "./demo-seed";
import { DEFAULT_PLANS } from "@/lib/constants";
import { settleUnits, round2, profitMultiplier, type Outcome } from "@/lib/odds";
import { uid } from "@/lib/utils";

interface Store {
  picks: Pick[];
  publications: PickPublication[];
  settlements: PickSettlement[];
  audit: PickAuditEntry[];
  profiles: Profile[];
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
  billing: BillingEvent[];
  tracked: TrackedBet[];
  notifications: Notification[];
  prefs: NotificationPreferences[];
  content: SiteContent;
  threads: CommunityThread[];
  posts: CommunityPost[];
}

function seed(): Store {
  const picks = buildDemoPicks();
  return {
    picks,
    publications: buildDemoPublications(picks),
    settlements: buildDemoSettlements(picks),
    audit: buildDemoAudit(picks),
    profiles: [...DEMO_USERS],
    subscriptions: [...DEMO_SUBSCRIPTIONS],
    plans: DEFAULT_PLANS.map((p) => ({ ...p, active: true })),
    billing: [...DEMO_BILLING],
    tracked: buildDemoTrackedBets(picks),
    notifications: [...DEMO_NOTIFICATIONS],
    prefs: [],
    content: { ...DEMO_CONTENT },
    threads: [...DEMO_THREADS],
    posts: [...DEMO_POSTS],
  };
}

// Survive HMR / route re-evaluation in dev.
const g = globalThis as unknown as { __ppDemoStore?: Store };
function store(): Store {
  if (!g.__ppDemoStore) g.__ppDemoStore = seed();
  return g.__ppDemoStore;
}

const nowIso = () => new Date().toISOString();
const clone = <T,>(v: T): T => structuredClone(v);

function applyFilters(picks: Pick[], f?: PickFilters) {
  if (!f) return picks;
  return picks.filter((p) => {
    if (f.sport && f.sport !== "all" && p.sport !== f.sport) return false;
    if (f.betType && f.betType !== "all" && p.betType !== f.betType) return false;
    if (f.result && f.result !== "all" && p.result !== f.result) return false;
    if (f.from && new Date(p.startTime) < new Date(f.from)) return false;
    if (f.to && new Date(p.startTime) > new Date(f.to)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!`${p.matchup} ${p.selection} ${p.sport} ${p.league}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function log(pickId: string, action: PickAuditEntry["action"], actor: Actor, extra: Partial<PickAuditEntry> = {}) {
  store().audit.push({ id: uid("aud"), pickId, action, actorId: actor.id, actorName: actor.name, createdAt: nowIso(), ...extra });
}

function snapshotOf(p: Pick): PickPublication["snapshot"] {
  const { result, netUnits, settledAt, settledBy, settlementNote, finalScore, ...rest } = p;
  void result; void netUnits; void settledAt; void settledBy; void settlementNote; void finalScore;
  return rest;
}

export const demoRepo: Repo = {
  mode: "demo",

  async listPublicPicks(filters) {
    const s = store();
    const list = s.picks.filter((p) => p.status === "published" || p.status === "settled" || p.status === "voided");
    return clone(applyFilters(list, filters).sort((a, b) => b.startTime.localeCompare(a.startTime)));
  },
  async listTodaysPicks() {
    const s = store();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 86400000);
    return clone(
      s.picks
        .filter((p) => (p.status === "published" || p.status === "settled") && new Date(p.startTime) >= start && new Date(p.startTime) < end)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
  },
  async getPick(id) {
    const p = store().picks.find((x) => x.id === id);
    return p ? clone(p) : null;
  },
  async getPickHistory(id) {
    const s = store();
    return clone({
      publications: s.publications.filter((x) => x.pickId === id).sort((a, b) => a.revision - b.revision),
      settlements: s.settlements.filter((x) => x.pickId === id),
      audit: s.audit.filter((x) => x.pickId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    });
  },

  async listAllPicks() {
    return clone([...store().picks].sort((a, b) => b.startTime.localeCompare(a.startTime)));
  },
  async createPick(input, actor) {
    const t = nowIso();
    const pick: Pick = {
      ...input,
      id: uid("pick"),
      status: input.status ?? "draft",
      publishedAt: null,
      isDemo: true,
      createdBy: actor.id,
      createdAt: t,
      updatedAt: t,
      result: "pending",
      netUnits: 0,
    };
    store().picks.push(pick);
    log(pick.id, "created", actor, { after: { selection: pick.selection, odds: pick.odds, stake: pick.stake } });
    if (pick.status === "scheduled") log(pick.id, "scheduled", actor, { after: { scheduledFor: pick.scheduledFor } });
    return clone(pick);
  },
  async updateUnpublishedPick(id, patch, actor) {
    const p = store().picks.find((x) => x.id === id);
    if (!p) throw new Error("Pick not found");
    if (p.publishedAt) throw new Error("Published picks are immutable. Use a correction with a reason instead.");
    const before = { selection: p.selection, odds: p.odds, stake: p.stake, matchup: p.matchup };
    Object.assign(p, patch, { updatedAt: nowIso() });
    log(id, "updated", actor, { before, after: { selection: p.selection, odds: p.odds, stake: p.stake, matchup: p.matchup } });
    return clone(p);
  },
  async publishPick(id, actor) {
    const s = store();
    const p = s.picks.find((x) => x.id === id);
    if (!p) throw new Error("Pick not found");
    if (p.publishedAt) throw new Error("Already published");
    const t = nowIso();
    p.status = "published";
    p.publishedAt = t;
    p.updatedAt = t;
    s.publications.push({ id: uid("pub"), pickId: id, revision: 1, snapshot: snapshotOf(p), publishedAt: t, publishedBy: actor.id });
    log(id, "published", actor);
    // notify subscribers
    const subs = s.subscriptions.filter((x) => x.status === "active" || x.status === "trialing").map((x) => x.userId);
    for (const userId of subs) {
      s.notifications.unshift({ id: uid("n"), userId, type: "new_pick", title: "Fresh pick in the jar", body: `${p.sport}: ${p.selection} (${p.odds > 0 ? "+" : ""}${p.odds})`, href: `/dashboard/picks`, createdAt: t });
    }
    return clone(p);
  },
  async schedulePick(id, scheduledFor, actor) {
    const p = store().picks.find((x) => x.id === id);
    if (!p) throw new Error("Pick not found");
    if (p.publishedAt) throw new Error("Already published");
    p.status = "scheduled";
    p.scheduledFor = scheduledFor;
    p.updatedAt = nowIso();
    log(id, "scheduled", actor, { after: { scheduledFor } });
    return clone(p);
  },
  async settlePick(id, input, actor) {
    const s = store();
    const p = s.picks.find((x) => x.id === id);
    if (!p) throw new Error("Pick not found");
    if (!p.publishedAt) throw new Error("Only published picks can be settled");
    if (p.status === "settled") throw new Error("Already settled — use a correction");
    const t = nowIso();
    const net = settleUnits(input.result, p.odds, p.stake);
    p.status = "settled";
    p.result = input.result;
    p.netUnits = net;
    p.settledAt = t;
    p.settledBy = actor.id;
    p.finalScore = input.finalScore ?? null;
    p.settlementNote = input.note ?? null;
    p.updatedAt = t;
    s.settlements.push({ id: uid("set"), pickId: id, result: input.result, netUnits: net, finalScore: input.finalScore, note: input.note, settledAt: t, settledBy: actor.id });
    log(id, "settled", actor, { after: { result: input.result, netUnits: net, finalScore: input.finalScore } });
    const subs = s.subscriptions.filter((x) => x.status === "active").map((x) => x.userId);
    for (const userId of subs) {
      s.notifications.unshift({ id: uid("n"), userId, type: "settled", title: `Pick settled: ${input.result.toUpperCase()}`, body: `${p.selection} — ${net >= 0 ? "+" : ""}${net.toFixed(2)}u`, href: `/picks/${p.id}`, createdAt: t });
    }
    // update user tracked bets that are pending
    for (const tb of s.tracked.filter((x) => x.pickId === id && x.result === "pending")) {
      tb.result = input.result;
      tb.netAmount = input.result === "win" ? round2(tb.stakeAmount * profitMultiplier(tb.oddsReceived)) : input.result === "loss" ? -tb.stakeAmount : 0;
      tb.updatedAt = t;
    }
    return clone(p);
  },
  async correctSettlement(id, input, actor) {
    const s = store();
    const p = s.picks.find((x) => x.id === id);
    if (!p || p.status !== "settled") throw new Error("Pick is not settled");
    if (!input.reason?.trim()) throw new Error("A reason is required for corrections");
    const t = nowIso();
    const before = { result: p.result, netUnits: p.netUnits, finalScore: p.finalScore };
    const prev = s.settlements.filter((x) => x.pickId === id && !x.supersededBy).at(-1);
    const net = settleUnits(input.result, p.odds, p.stake);
    const entry: PickSettlement = { id: uid("set"), pickId: id, result: input.result, netUnits: net, finalScore: input.finalScore ?? p.finalScore, note: input.reason, settledAt: t, settledBy: actor.id };
    if (prev) prev.supersededBy = entry.id;
    s.settlements.push(entry);
    p.result = input.result;
    p.netUnits = net;
    p.finalScore = input.finalScore ?? p.finalScore;
    p.settlementNote = input.reason;
    p.updatedAt = t;
    log(id, "resettled", actor, { before, after: { result: input.result, netUnits: net }, reason: input.reason });
    return clone(p);
  },
  async voidPick(id, reason, actor) {
    const p = store().picks.find((x) => x.id === id);
    if (!p) throw new Error("Pick not found");
    const before = { status: p.status, result: p.result, netUnits: p.netUnits };
    p.status = "voided";
    p.result = "void";
    p.netUnits = 0;
    p.settlementNote = reason;
    p.updatedAt = nowIso();
    log(id, "voided", actor, { before, reason });
    return clone(p);
  },
  async releaseScheduledPicks(now = new Date()) {
    const s = store();
    const due = s.picks.filter((p) => p.status === "scheduled" && p.scheduledFor && new Date(p.scheduledFor) <= now);
    const out: Pick[] = [];
    for (const p of due) out.push(await demoRepo.publishPick(p.id, { id: "system", name: "Scheduler" }));
    return out;
  },

  async getProfile(userId) {
    const p = store().profiles.find((x) => x.id === userId);
    return p ? clone(p) : null;
  },
  async listProfiles() { return clone(store().profiles); },
  async updateProfile(userId, patch) {
    const p = store().profiles.find((x) => x.id === userId);
    if (!p) throw new Error("Profile not found");
    Object.assign(p, patch);
    return clone(p);
  },
  async getActiveSubscription(userId) {
    const now = new Date();
    const sub = store().subscriptions.find(
      (s) => s.userId === userId && (s.status === "active" || s.status === "trialing") && new Date(s.currentPeriodEnd) > now,
    );
    return sub ? clone(sub) : null;
  },
  async listSubscriptions() { return clone(store().subscriptions); },
  async listPlans() { return clone(store().plans); },
  async updatePlan(key, patch) {
    const p = store().plans.find((x) => x.key === key);
    if (!p) throw new Error("Plan not found");
    Object.assign(p, patch);
    return clone(p);
  },
  async upsertSubscription(sub) {
    const s = store();
    const existing = sub.id ? s.subscriptions.find((x) => x.id === sub.id) : s.subscriptions.find((x) => x.userId === sub.userId && x.status === "active");
    if (existing) { Object.assign(existing, sub); return clone(existing); }
    const created: Subscription = { ...sub, id: sub.id ?? uid("sub"), createdAt: nowIso() };
    s.subscriptions.push(created);
    return clone(created);
  },
  async cancelSubscription(userId, atPeriodEnd) {
    const sub = store().subscriptions.find((s) => s.userId === userId && s.status === "active");
    if (!sub) return null;
    if (atPeriodEnd) sub.cancelAtPeriodEnd = true;
    else { sub.status = "canceled"; sub.currentPeriodEnd = nowIso(); }
    return clone(sub);
  },
  async listBillingEvents(userId) {
    const list = store().billing.filter((b) => !userId || b.userId === userId);
    return clone(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async addBillingEvent(ev) {
    const e: BillingEvent = { ...ev, id: uid("be"), createdAt: nowIso() };
    store().billing.unshift(e);
    return clone(e);
  },

  async listTrackedBets(userId) {
    return clone(store().tracked.filter((t) => t.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async upsertTrackedBet(bet) {
    const s = store();
    const t = nowIso();
    const net = bet.result === "win" ? round2(bet.stakeAmount * profitMultiplier(bet.oddsReceived)) : bet.result === "loss" ? -bet.stakeAmount : 0;
    const existing = bet.id ? s.tracked.find((x) => x.id === bet.id && x.userId === bet.userId) : undefined;
    if (existing) { Object.assign(existing, bet, { netAmount: net, updatedAt: t }); return clone(existing); }
    const created: TrackedBet = { ...bet, id: uid("tb"), netAmount: net, createdAt: t, updatedAt: t };
    s.tracked.push(created);
    return clone(created);
  },
  async deleteTrackedBet(userId, id) {
    const s = store();
    s.tracked = s.tracked.filter((x) => !(x.id === id && x.userId === userId));
  },

  async listNotifications(userId) {
    return clone(store().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async markNotificationsRead(userId, ids) {
    const t = nowIso();
    for (const n of store().notifications) if (n.userId === userId && (!ids || ids.includes(n.id)) && !n.readAt) n.readAt = t;
  },
  async broadcastNotification(n, audience) {
    const s = store();
    const subs = new Set(s.subscriptions.filter((x) => x.status === "active").map((x) => x.userId));
    const targets = s.profiles.filter((p) => audience === "all" || subs.has(p.id));
    const t = nowIso();
    for (const p of targets) s.notifications.unshift({ ...n, id: uid("n"), userId: p.id, readAt: null, createdAt: t });
    return targets.length;
  },
  async getNotificationPreferences(userId) {
    const s = store();
    let p = s.prefs.find((x) => x.userId === userId);
    if (!p) {
      const profile = s.profiles.find((x) => x.id === userId);
      p = { userId, email: profile?.email ?? null, newPicks: true, upcomingGames: false, settledResults: true, renewals: true, pushEnabled: false };
      s.prefs.push(p);
    }
    return clone(p);
  },
  async updateNotificationPreferences(userId, patch) {
    const p = await demoRepo.getNotificationPreferences(userId);
    const stored = store().prefs.find((x) => x.userId === userId)!;
    Object.assign(stored, patch);
    return clone({ ...p, ...patch });
  },

  async getSiteContent() { return clone(store().content); },
  async updateSiteContent(patch, actor) {
    const s = store();
    s.content = { ...s.content, ...patch, updatedAt: nowIso(), updatedBy: actor.id };
    return clone(s.content);
  },

  async listThreads() {
    return clone([...store().threads].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)));
  },
  async getThread(id) {
    const s = store();
    const thread = s.threads.find((t) => t.id === id);
    if (!thread) return null;
    return clone({ thread, posts: s.posts.filter((p) => p.threadId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) });
  },
  async createThread(input, actor) {
    const t: CommunityThread = { id: uid("th"), authorId: actor.id, authorName: actor.name, title: input.title, body: input.body, sport: (input.sport as CommunityThread["sport"]) ?? null, pinned: false, locked: false, createdAt: nowIso(), replyCount: 0 };
    store().threads.unshift(t);
    return clone(t);
  },
  async createPost(threadId, body, actor) {
    const s = store();
    const th = s.threads.find((t) => t.id === threadId);
    if (!th) throw new Error("Thread not found");
    if (th.locked) throw new Error("Thread is locked");
    const p: CommunityPost = { id: uid("po"), threadId, authorId: actor.id, authorName: actor.name, body, hidden: false, createdAt: nowIso() };
    s.posts.push(p);
    th.replyCount++;
    return clone(p);
  },
  async moderatePost(postId, hidden) {
    const p = store().posts.find((x) => x.id === postId);
    if (p) p.hidden = hidden;
  },
};

export const outcomes: Outcome[] = ["win", "loss", "push", "void"];
