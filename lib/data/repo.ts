import type {
  Pick, PickPublication, PickSettlement, PickAuditEntry, Profile, Subscription, SubscriptionPlan,
  TrackedBet, Notification, NotificationPreferences, SiteContent, CommunityThread, CommunityPost, BillingEvent, PickResult,
} from "./types";
import type { Outcome } from "@/lib/odds";

export interface PickFilters {
  sport?: string;
  betType?: string;
  result?: PickResult | "all";
  from?: string;
  to?: string;
  search?: string;
}

export type PickInput = Omit<
  Pick,
  "id" | "createdAt" | "updatedAt" | "status" | "publishedAt" | "result" | "netUnits" | "settledAt" | "settledBy" | "settlementNote" | "finalScore" | "isDemo" | "createdBy"
> & { status?: "draft" | "scheduled" };

export interface Actor { id: string; name: string }

export interface Repo {
  readonly mode: "demo" | "supabase";

  // ---- picks (public / member) ----
  listPublicPicks(filters?: PickFilters): Promise<Pick[]>; // published + settled only
  listTodaysPicks(): Promise<Pick[]>;
  getPick(id: string): Promise<Pick | null>;
  getPickHistory(id: string): Promise<{ publications: PickPublication[]; settlements: PickSettlement[]; audit: PickAuditEntry[] }>;

  // ---- picks (admin) ----
  listAllPicks(): Promise<Pick[]>;
  createPick(input: PickInput, actor: Actor): Promise<Pick>;
  updateUnpublishedPick(id: string, patch: Partial<PickInput>, actor: Actor): Promise<Pick>;
  publishPick(id: string, actor: Actor): Promise<Pick>;
  schedulePick(id: string, scheduledFor: string, actor: Actor): Promise<Pick>;
  settlePick(id: string, input: { result: Outcome; finalScore?: string; note?: string }, actor: Actor): Promise<Pick>;
  correctSettlement(id: string, input: { result: Outcome; finalScore?: string; reason: string }, actor: Actor): Promise<Pick>;
  voidPick(id: string, reason: string, actor: Actor): Promise<Pick>;
  releaseScheduledPicks(now?: Date): Promise<Pick[]>;

  // ---- users / subs ----
  getProfile(userId: string): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;
  updateProfile(userId: string, patch: Partial<{ displayName: string; ageVerifiedAt: string | null; jurisdiction: string | null; role: Profile["role"] }>): Promise<Profile>;
  getActiveSubscription(userId: string): Promise<Subscription | null>;
  listSubscriptions(): Promise<Subscription[]>;
  listPlans(): Promise<SubscriptionPlan[]>;
  updatePlan(key: string, patch: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  upsertSubscription(sub: Omit<Subscription, "id" | "createdAt"> & { id?: string }): Promise<Subscription>;
  cancelSubscription(userId: string, atPeriodEnd: boolean): Promise<Subscription | null>;
  listBillingEvents(userId?: string): Promise<BillingEvent[]>;
  addBillingEvent(ev: Omit<BillingEvent, "id" | "createdAt">): Promise<BillingEvent>;

  // ---- tracker ----
  listTrackedBets(userId: string): Promise<TrackedBet[]>;
  upsertTrackedBet(bet: Omit<TrackedBet, "id" | "createdAt" | "updatedAt" | "netAmount"> & { id?: string }): Promise<TrackedBet>;
  deleteTrackedBet(userId: string, id: string): Promise<void>;

  // ---- notifications ----
  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationsRead(userId: string, ids?: string[]): Promise<void>;
  broadcastNotification(n: Omit<Notification, "id" | "createdAt" | "userId" | "readAt">, audience: "all" | "subscribers"): Promise<number>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences>;

  // ---- content ----
  getSiteContent(): Promise<SiteContent>;
  updateSiteContent(patch: Partial<SiteContent>, actor: Actor): Promise<SiteContent>;

  // ---- community ----
  listThreads(): Promise<CommunityThread[]>;
  getThread(id: string): Promise<{ thread: CommunityThread; posts: CommunityPost[] } | null>;
  createThread(input: { title: string; body: string; sport?: string | null }, actor: Actor): Promise<CommunityThread>;
  createPost(threadId: string, body: string, actor: Actor): Promise<CommunityPost>;
  moderatePost(postId: string, hidden: boolean): Promise<void>;
}
