/**
 * DEMONSTRATION DATA ONLY.
 *
 * Every record produced here is flagged `isDemo: true` and rendered with a
 * visible "Demo data" label. It exists so the interfaces can be exercised
 * before any real picks have been published and settled. It is generated from
 * a seeded pseudo-random process and must never be presented as a real
 * track record. Production deployments should run with Supabase configured
 * and an empty picks table.
 */
import type { Pick, Profile, Subscription, TrackedBet, Notification, CommunityThread, CommunityPost, SiteContent, BillingEvent, PickPublication, PickSettlement, PickAuditEntry } from "./types";
import { settleUnits, round2 } from "@/lib/odds";
import type { SportKey, BetTypeKey } from "@/lib/constants";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20251021);
const pickOne = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

export const DEMO_USERS: Profile[] = [
  { id: "demo-admin", email: "admin@demo.picklepicks.local", displayName: "Mr. Pickle (Admin)", role: "admin", createdAt: "2026-05-01T12:00:00Z" },
  { id: "demo-member", email: "member@demo.picklepicks.local", displayName: "Jordan (VIP Member)", role: "member", createdAt: "2026-06-11T12:00:00Z" },
  { id: "demo-free", email: "free@demo.picklepicks.local", displayName: "Sam (Free Account)", role: "member", createdAt: "2026-10-01T12:00:00Z" },
];

const NOW = new Date("2026-10-21T15:00:00Z");

const TEAMS: Record<SportKey, { teams: string[]; players: string[]; league: string }> = {
  NBA: { league: "NBA", teams: ["Pacers", "Knicks", "Celtics", "Nuggets", "Thunder", "Lakers", "Warriors", "Bucks", "Heat", "Suns", "Timberwolves", "Mavericks"], players: ["T. Haliburton", "J. Brunson", "J. Tatum", "N. Jokić", "S. Gilgeous-Alexander", "A. Edwards", "L. Dončić"] },
  NFL: { league: "NFL", teams: ["Chiefs", "Bills", "Eagles", "Lions", "49ers", "Ravens", "Bengals", "Cowboys", "Packers", "Texans", "Dolphins", "Jets"], players: ["P. Mahomes", "J. Allen", "J. Hurts", "L. Jackson", "C. Lamb", "T. Kelce"] },
  MLB: { league: "MLB", teams: ["Dodgers", "Yankees", "Braves", "Astros", "Phillies", "Orioles", "Padres", "Mets", "Guardians", "Rangers"], players: ["S. Ohtani", "A. Judge", "J. Soto", "B. Witt Jr.", "M. Betts"] },
  NHL: { league: "NHL", teams: ["Oilers", "Panthers", "Rangers", "Avalanche", "Stars", "Bruins", "Maple Leafs", "Hurricanes", "Golden Knights", "Devils"], players: ["C. McDavid", "N. MacKinnon", "A. Matthews", "L. Draisaitl"] },
  NCAAB: { league: "NCAA Basketball", teams: ["Duke", "Kansas", "UConn", "Purdue", "Houston", "Arizona", "Gonzaga", "North Carolina", "Tennessee", "Auburn"], players: [] },
  NCAAF: { league: "NCAA Football", teams: ["Georgia", "Ohio State", "Texas", "Oregon", "Alabama", "Michigan", "Penn State", "Notre Dame", "Ole Miss", "LSU"], players: [] },
  OTHER: { league: "ATP / PGA / UFC", teams: ["C. Alcaraz", "J. Sinner", "S. Scheffler", "R. McIlroy", "I. Makhachev", "J. Jones"], players: [] },
};

const BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet"];
const ODDS_POOL = [-110, -110, -110, -115, -105, -120, -108, -112, +100, +105, +110, +120, +135, +150, -130, -140, -150, +160, +175, -125];

const ANALYSES = [
  "The number is a half point off where our market model has it, and the matchup data (pace, rebounding differential, recent rotation changes) leans the same way. We're not chasing a narrative here; the price is simply favorable.",
  "Rest-and-travel spot. The side we're backing is on normal rest at home while the opponent is on the second night of a back-to-back after a late tip. Historically this spot has been profitable for the rested team, and the line hasn't fully adjusted.",
  "Pitching matchup drives this one. Platoon splits and park factors both point toward a lower-scoring game than the posted total implies, and the bullpen usage over the last three days favors the under.",
  "Line movement has gone against the public here, which is usually the sharper side of the market. Our power rating has this closer than the spread suggests.",
  "Usage rate is the story. With a key rotation piece sidelined, this player's assist opportunities have spiked over the last five games and the prop line hasn't caught up.",
  "Weather is the edge: sustained wind over 15 mph at kickoff suppresses the passing game and pushes the total down. Books were slow to adjust.",
  "Goalie confirmation moves this from a lean to a play. The backup's save percentage against this opponent and the opponent's shot-quality metrics make the moneyline a good price.",
];

const KEY_STATS = [
  ["Model line", "Market line", "Edge"],
  ["Pace (L10)", "Opp DRtg", "Rest days"],
  ["Park factor", "Bullpen xFIP (3d)", "Wind"],
  ["ATS (L10)", "Line move", "Public %"],
];

function sportSelection(sport: SportKey, betType: BetTypeKey, away: string, home: string, odds: number) {
  const t = TEAMS[sport];
  switch (betType) {
    case "spread": {
      const n = (Math.floor(rand() * 14) + 1) / 2 + (sport === "NFL" || sport === "NCAAF" ? 0 : 1);
      const side = rand() > 0.5 ? home : away;
      const sign = side === home ? "-" : "+";
      return { selection: `${side} ${sign}${n}`, line: `${sign}${n}` };
    }
    case "moneyline": {
      const side = rand() > 0.5 ? home : away;
      return { selection: `${side} ML`, line: null };
    }
    case "total": {
      const base = sport === "NBA" ? 224 : sport === "NFL" ? 46 : sport === "MLB" ? 8.5 : sport === "NHL" ? 6 : sport === "NCAAB" ? 148 : 54;
      const n = base + (Math.floor(rand() * 10) - 5) * 0.5;
      const ou = rand() > 0.5 ? "Over" : "Under";
      return { selection: `${ou} ${n}`, line: `${ou[0]}${n}` };
    }
    case "player_prop": {
      const player = pickOne(t.players.length ? t.players : t.teams);
      const stat = sport === "NBA" ? pickOne(["Points", "Assists", "Rebounds", "3PM"]) : sport === "NFL" ? pickOne(["Pass Yds", "Rec Yds", "Rush Yds"]) : sport === "MLB" ? pickOne(["Total Bases", "Strikeouts", "Hits"]) : "Shots on Goal";
      const n = sport === "NBA" ? (stat === "3PM" ? 2.5 : 8.5 + Math.floor(rand() * 16)) : sport === "NFL" ? 60.5 + Math.floor(rand() * 200) : 1.5 + Math.floor(rand() * 4);
      return { selection: `${player} ${rand() > 0.5 ? "Over" : "Under"} ${n} ${stat}`, line: `${n}` };
    }
    case "team_prop":
      return { selection: `${home} Team Total Over ${sport === "NBA" ? 112.5 : 24.5}`, line: null };
    case "parlay":
      return { selection: `${home} ML + ${away} +${(Math.floor(rand() * 6) + 3)}.5 (2-leg)`, line: null };
  }
  void odds;
  return { selection: `${home} ML`, line: null };
}

function makePick(i: number, when: Date, opts: Partial<Pick> = {}): Pick {
  const sport = opts.sport ?? pickOne<SportKey>(["NBA", "NBA", "NFL", "NFL", "MLB", "MLB", "NHL", "NCAAB", "NCAAF", "OTHER"]);
  const t = TEAMS[sport];
  const away = pickOne(t.teams);
  let home = pickOne(t.teams);
  while (home === away) home = pickOne(t.teams);
  const betType = opts.betType ?? pickOne<BetTypeKey>(["spread", "spread", "moneyline", "total", "total", "player_prop", "player_prop", "parlay"]);
  const odds = opts.odds ?? (betType === "parlay" ? pickOne([+180, +210, +260, +300]) : pickOne(ODDS_POOL));
  const { selection, line } = sportSelection(sport, betType, away, home, odds);
  const stake = opts.stake ?? pickOne([0.5, 1, 1, 1, 1, 1.5, 2]);
  const confidence = stake >= 2 ? "strong" : stake >= 1 ? "play" : "lean";
  const publishedAt = new Date(when.getTime() - (3 + rand() * 8) * 3600000).toISOString();
  const ks = pickOne(KEY_STATS);
  const sep = sport === "OTHER" ? " vs. " : " @ ";
  return {
    id: `demo-pick-${String(i).padStart(4, "0")}`,
    sport,
    league: t.league,
    matchup: `${away}${sep}${home}`,
    awayTeam: away,
    homeTeam: home,
    startTime: when.toISOString(),
    betType,
    selection,
    line,
    odds,
    stake,
    sportsbook: pickOne(BOOKS),
    confidence,
    confidenceNote:
      "Confidence tiers (Lean / Play / Strong) reflect recommended unit sizing from our internal process. They are not calibrated win probabilities and are not guarantees.",
    analysis: pickOne(ANALYSES),
    keyStats: [
      { label: ks[0], value: `${(rand() * 6 - 3).toFixed(1)}` },
      { label: ks[1], value: `${(100 + rand() * 20).toFixed(1)}` },
      { label: ks[2], value: `${Math.floor(rand() * 60 + 20)}%` },
    ],
    status: "published",
    publishedAt,
    isPremium: true,
    isDemo: true,
    createdBy: "demo-admin",
    createdAt: publishedAt,
    updatedAt: publishedAt,
    result: "pending",
    netUnits: 0,
    ...opts,
  };
}

function settle(p: Pick, result: "win" | "loss" | "push"): Pick {
  const settledAt = new Date(new Date(p.startTime).getTime() + 3.2 * 3600000).toISOString();
  return {
    ...p,
    status: "settled",
    result,
    netUnits: settleUnits(result, p.odds, p.stake),
    settledAt,
    settledBy: "demo-admin",
    finalScore: `${Math.floor(rand() * 40 + 90)}-${Math.floor(rand() * 40 + 90)}`,
    updatedAt: settledAt,
  };
}

export function buildDemoPicks(): Pick[] {
  const picks: Pick[] = [];
  let i = 1;
  // ~160 days of history with a realistic mix including losing stretches.
  const start = new Date(NOW.getTime() - 160 * 86400000);
  for (let d = 0; d < 158; d++) {
    const day = new Date(start.getTime() + d * 86400000);
    const count = rand() < 0.22 ? 0 : rand() < 0.6 ? 1 : 2;
    // Streaky regime: some weeks run cold on purpose so drawdowns are visible.
    const regime = Math.sin(d / 9) * 0.07;
    for (let c = 0; c < count; c++) {
      const when = new Date(day.getTime() + (17 + Math.floor(rand() * 6)) * 3600000 + Math.floor(rand() * 4) * 900000);
      const p = makePick(i++, when);
      const r = rand();
      const winP = 0.515 + regime;
      const result = r < 0.04 ? "push" : r < 0.04 + winP ? "win" : "loss";
      picks.push(settle(p, result));
    }
  }
  // A couple of settled yesterday
  // Today's picks: published, pending
  const todayBase = new Date(NOW.getTime());
  todayBase.setUTCHours(23, 10, 0, 0);
  picks.push(makePick(i++, new Date(todayBase.getTime()), { sport: "NBA", betType: "player_prop", selection: "T. Haliburton Over 8.5 Assists", line: "8.5", odds: -110, stake: 1, matchup: "Pacers @ Knicks", awayTeam: "Pacers", homeTeam: "Knicks" }));
  picks.push(makePick(i++, new Date(todayBase.getTime() + 1800000), { sport: "NHL", betType: "moneyline", odds: +125, stake: 1 }));
  picks.push(makePick(i++, new Date(todayBase.getTime() + 3600000), { sport: "NFL", betType: "total", stake: 2, odds: -108 }));
  // Tomorrow scheduled
  picks.push(
    makePick(i++, new Date(NOW.getTime() + 30 * 3600000), {
      status: "scheduled",
      scheduledFor: new Date(NOW.getTime() + 18 * 3600000).toISOString(),
      publishedAt: null,
      sport: "NCAAF",
      betType: "spread",
    }),
  );
  // Draft
  picks.push(makePick(i++, new Date(NOW.getTime() + 50 * 3600000), { status: "draft", publishedAt: null, sport: "MLB", betType: "total" }));
  return picks;
}

export function buildDemoPublications(picks: Pick[]): PickPublication[] {
  return picks
    .filter((p) => p.publishedAt)
    .map((p) => {
      const { result, netUnits, settledAt, settledBy, settlementNote, finalScore, ...snapshot } = p;
      void result; void netUnits; void settledAt; void settledBy; void settlementNote; void finalScore;
      return { id: `pub-${p.id}`, pickId: p.id, revision: 1, snapshot: { ...snapshot, status: "published" }, publishedAt: p.publishedAt!, publishedBy: "demo-admin" };
    });
}

export function buildDemoSettlements(picks: Pick[]): PickSettlement[] {
  return picks
    .filter((p) => p.status === "settled" && p.result !== "pending")
    .map((p) => ({
      id: `set-${p.id}`,
      pickId: p.id,
      result: p.result as "win" | "loss" | "push",
      netUnits: p.netUnits,
      finalScore: p.finalScore,
      settledAt: p.settledAt!,
      settledBy: "demo-admin",
    }));
}

export function buildDemoAudit(picks: Pick[]): PickAuditEntry[] {
  const out: PickAuditEntry[] = [];
  for (const p of picks) {
    out.push({ id: `aud-c-${p.id}`, pickId: p.id, action: "created", actorId: "demo-admin", actorName: "Mr. Pickle (Admin)", createdAt: p.createdAt });
    if (p.publishedAt) out.push({ id: `aud-p-${p.id}`, pickId: p.id, action: "published", actorId: "demo-admin", actorName: "Mr. Pickle (Admin)", createdAt: p.publishedAt });
    if (p.settledAt) out.push({ id: `aud-s-${p.id}`, pickId: p.id, action: "settled", actorId: "demo-admin", actorName: "Mr. Pickle (Admin)", after: { result: p.result, netUnits: p.netUnits }, createdAt: p.settledAt });
  }
  return out;
}

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "demo-sub-1",
    userId: "demo-member",
    planKey: "vip",
    status: "active",
    currentPeriodStart: "2026-10-01T00:00:00Z",
    currentPeriodEnd: "2026-11-01T00:00:00Z",
    cancelAtPeriodEnd: false,
    provider: "demo",
    createdAt: "2026-06-11T12:00:00Z",
  },
];

export const DEMO_BILLING: BillingEvent[] = [
  { id: "be-1", userId: "demo-member", type: "invoice.paid", amountCents: 7999, currency: "usd", description: "VIP Pickle Jar — monthly", createdAt: "2026-10-01T00:00:00Z" },
  { id: "be-2", userId: "demo-member", type: "invoice.paid", amountCents: 7999, currency: "usd", description: "VIP Pickle Jar — monthly", createdAt: "2026-09-01T00:00:00Z" },
  { id: "be-3", userId: "demo-member", type: "invoice.paid", amountCents: 7999, currency: "usd", description: "VIP Pickle Jar — monthly", createdAt: "2026-08-01T00:00:00Z" },
];

export function buildDemoTrackedBets(picks: Pick[]): TrackedBet[] {
  const settled = picks.filter((p) => p.status === "settled").slice(-14);
  return settled.slice(0, 9).map((p, i) => {
    const stake = [25, 50, 25, 100, 25, 50, 25, 25, 50][i];
    const oddsReceived = p.odds + (i % 3 === 0 ? 5 : 0);
    const net = p.result === "win" ? round2(stake * (oddsReceived > 0 ? oddsReceived / 100 : 100 / Math.abs(oddsReceived))) : p.result === "loss" ? -stake : 0;
    return {
      id: `tb-${i}`,
      userId: "demo-member",
      pickId: p.id,
      oddsReceived,
      stakeAmount: stake,
      sportsbook: p.sportsbook,
      result: p.result,
      netAmount: net,
      createdAt: p.publishedAt ?? p.createdAt,
      updatedAt: p.settledAt ?? p.updatedAt,
    };
  });
}

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n-1", userId: "demo-member", type: "new_pick", title: "Fresh Picks are in the jar", body: "3 new premium picks published for tonight's slate.", href: "/dashboard/picks", createdAt: new Date(NOW.getTime() - 2 * 3600000).toISOString() },
  { id: "n-2", userId: "demo-member", type: "settled", title: "Last night's picks are settled", body: "2-1 on the night. See the ledger for details.", href: "/dashboard/history", readAt: new Date(NOW.getTime() - 20 * 3600000).toISOString(), createdAt: new Date(NOW.getTime() - 22 * 3600000).toISOString() },
  { id: "n-3", userId: "demo-member", type: "renewal", title: "VIP Pickle Jar renews Nov 1", body: "Your membership renews automatically. Manage it anytime from Subscription.", href: "/dashboard/subscription", readAt: null, createdAt: new Date(NOW.getTime() - 3 * 86400000).toISOString() },
];

export const DEMO_THREADS: CommunityThread[] = [
  { id: "th-1", authorId: "demo-admin", authorName: "Mr. Pickle (Admin)", title: "Game-day thread: Tuesday slate", body: "Drop your thoughts on tonight's card here. Keep it civil, keep it sharp.", sport: "NBA", pinned: true, locked: false, createdAt: new Date(NOW.getTime() - 5 * 3600000).toISOString(), replyCount: 2 },
  { id: "th-2", authorId: "demo-member", authorName: "Jordan (VIP Member)", title: "How do you size units on parlays?", body: "Curious how everyone treats parlay stakes relative to straight bets.", sport: null, pinned: false, locked: false, createdAt: new Date(NOW.getTime() - 2 * 86400000).toISOString(), replyCount: 1 },
];

export const DEMO_POSTS: CommunityPost[] = [
  { id: "po-1", threadId: "th-1", authorId: "demo-member", authorName: "Jordan (VIP Member)", body: "Like the Haliburton assists play. Knicks switch everything and he feasts on that.", hidden: false, createdAt: new Date(NOW.getTime() - 4 * 3600000).toISOString() },
  { id: "po-2", threadId: "th-1", authorId: "demo-admin", authorName: "Mr. Pickle (Admin)", body: "That's the read. Usage is up with the rotation change.", hidden: false, createdAt: new Date(NOW.getTime() - 3.5 * 3600000).toISOString() },
  { id: "po-3", threadId: "th-2", authorId: "demo-admin", authorName: "Mr. Pickle (Admin)", body: "Half a unit max for me. Variance is the enemy.", hidden: false, createdAt: new Date(NOW.getTime() - 1.5 * 86400000).toISOString() },
];

export const DEMO_CONTENT: SiteContent = {
  heroEyebrow: "THE PICKLE KNOWS BALL",
  heroHeadline: "BIG PICKS. BIG PERSONALITY. REAL RESULTS.",
  heroSubheadline:
    "Data-driven sports picks, transparent performance tracking, and a community that lives for game day. Get access to Mr. Pickle's latest selections.",
  primaryCta: "Get Today's Picks",
  secondaryCta: "View Our Record",
  announcement: null,
  promoImageUrl: null,
  updatedAt: "2026-10-01T00:00:00Z",
  updatedBy: "demo-admin",
};

export const DEMO_NOW = NOW;
