import type { BetTypeKey, SportKey } from "@/lib/constants";
import type { Outcome } from "@/lib/odds";

export type Role = "member" | "admin";
export type PickStatus = "draft" | "scheduled" | "published" | "settled" | "voided";
export type PickResult = Outcome | "pending";
export type ConfidenceTier = "lean" | "play" | "strong";

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  avatarUrl?: string | null;
  ageVerifiedAt?: string | null;
  jurisdiction?: string | null;
  createdAt: string;
}

export interface SubscriptionPlan {
  key: string;
  name: string;
  priceCents: number;
  interval: "day" | "week" | "month";
  intervalCount: number;
  tagline: string;
  features: string[];
  highlight: boolean;
  active: boolean;
}

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "expired" | "incomplete";

export interface Subscription {
  id: string;
  userId: string;
  planKey: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  provider: "stripe" | "manual" | "demo";
  providerSubscriptionId?: string | null;
  createdAt: string;
}

export interface BillingEvent {
  id: string;
  userId: string;
  type: string;
  amountCents: number;
  currency: string;
  description: string;
  createdAt: string;
}

/**
 * A pick. Once `publishedAt` is set, the betting fields (sport, matchup,
 * selection, odds, stake, analysis) are frozen — see `pick_publications`
 * snapshots and the audit log for any correction history.
 */
export interface Pick {
  id: string;
  sport: SportKey;
  league: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  startTime: string;
  betType: BetTypeKey;
  selection: string;
  line?: string | null;
  odds: number;
  stake: number;
  sportsbook: string;
  confidence: ConfidenceTier;
  confidenceNote: string;
  analysis: string;
  keyStats: { label: string; value: string }[];
  status: PickStatus;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  isPremium: boolean;
  isDemo: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // settlement
  result: PickResult;
  netUnits: number;
  settledAt?: string | null;
  settledBy?: string | null;
  settlementNote?: string | null;
  finalScore?: string | null;
}

export interface PickPublication {
  id: string;
  pickId: string;
  revision: number;
  snapshot: Omit<Pick, "result" | "netUnits" | "settledAt" | "settledBy" | "settlementNote" | "finalScore">;
  publishedAt: string;
  publishedBy: string;
  reason?: string | null;
}

export interface PickSettlement {
  id: string;
  pickId: string;
  result: Outcome;
  netUnits: number;
  finalScore?: string | null;
  note?: string | null;
  settledAt: string;
  settledBy: string;
  supersededBy?: string | null;
}

export interface PickAuditEntry {
  id: string;
  pickId: string;
  action: "created" | "updated" | "scheduled" | "published" | "settled" | "resettled" | "voided" | "corrected";
  actorId: string;
  actorName: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
}

export interface TrackedBet {
  id: string;
  userId: string;
  pickId: string;
  oddsReceived: number;
  stakeAmount: number; // dollars
  sportsbook: string;
  result: PickResult;
  netAmount: number; // dollars
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "new_pick" | "upcoming_game" | "settled" | "renewal" | "system";
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  email: string | null;
  newPicks: boolean;
  upcomingGames: boolean;
  settledResults: boolean;
  renewals: boolean;
  pushEnabled: boolean;
}

export interface SiteContent {
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCta: string;
  secondaryCta: string;
  announcement?: string | null;
  promoImageUrl?: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface CommunityThread {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  sport?: SportKey | null;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  replyCount: number;
}

export interface CommunityPost {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  hidden: boolean;
  createdAt: string;
}

export interface Entitlement {
  isSubscriber: boolean;
  isAdmin: boolean;
  planKey?: string | null;
  expiresAt?: string | null;
  subscription?: Subscription | null;
}
