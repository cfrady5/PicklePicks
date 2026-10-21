import type { Pick } from "@/lib/data/types";
import { averageAmericanOdds, profitMultiplier, round2 } from "@/lib/odds";
import type { SportKey, BetTypeKey } from "@/lib/constants";

export interface PerformanceStats {
  totalPicks: number;
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  winRate: number | null; // wins / (wins + losses)
  unitsStaked: number;
  netUnits: number;
  roi: number | null; // netUnits / unitsStaked
  avgOdds: number | null;
  streak: { type: "W" | "L" | null; length: number };
  bestPeriod: { label: string; net: number } | null;
  worstPeriod: { label: string; net: number } | null;
  maxDrawdown: number; // in units, negative or 0
  longestWinStreak: number;
  longestLossStreak: number;
}

export const isSettled = (p: Pick) => p.status === "settled" && p.result !== "pending";
const isGraded = (p: Pick) => isSettled(p) && (p.result === "win" || p.result === "loss");

export function sortBySettled(picks: Pick[]) {
  return [...picks].sort((a, b) => {
    const ta = new Date(a.settledAt ?? a.startTime).getTime();
    const tb = new Date(b.settledAt ?? b.startTime).getTime();
    return ta - tb;
  });
}

export function computeStats(picks: Pick[]): PerformanceStats {
  const published = picks.filter((p) => p.status !== "draft" && p.status !== "scheduled");
  const settled = sortBySettled(published.filter(isSettled));
  const wins = settled.filter((p) => p.result === "win").length;
  const losses = settled.filter((p) => p.result === "loss").length;
  const pushes = settled.filter((p) => p.result === "push" || p.result === "void").length;
  const pending = published.filter((p) => !isSettled(p)).length;
  const unitsStaked = round2(settled.filter(isGraded).reduce((a, p) => a + p.stake, 0));
  const netUnits = round2(settled.reduce((a, p) => a + p.netUnits, 0));
  const graded = wins + losses;

  // streaks
  let streakType: "W" | "L" | null = null;
  let streakLen = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    const r = settled[i].result;
    if (r !== "win" && r !== "loss") continue;
    const t = r === "win" ? "W" : "L";
    if (!streakType) streakType = t;
    if (t === streakType) streakLen++;
    else break;
  }
  let longestW = 0, longestL = 0, curW = 0, curL = 0;
  for (const p of settled) {
    if (p.result === "win") { curW++; curL = 0; }
    else if (p.result === "loss") { curL++; curW = 0; }
    else continue;
    longestW = Math.max(longestW, curW);
    longestL = Math.max(longestL, curL);
  }

  // drawdown + monthly best/worst
  let peak = 0, cum = 0, maxDd = 0;
  const monthly = new Map<string, number>();
  for (const p of settled) {
    cum = round2(cum + p.netUnits);
    peak = Math.max(peak, cum);
    maxDd = Math.min(maxDd, round2(cum - peak));
    const key = (p.settledAt ?? p.startTime).slice(0, 7);
    monthly.set(key, round2((monthly.get(key) ?? 0) + p.netUnits));
  }
  const months = [...monthly.entries()];
  const best = months.length ? months.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const worst = months.length ? months.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
  const labelMonth = (k: string) =>
    new Date(`${k}-15T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

  return {
    totalPicks: published.length,
    settled: settled.length,
    wins,
    losses,
    pushes,
    pending,
    winRate: graded ? wins / graded : null,
    unitsStaked,
    netUnits,
    roi: unitsStaked > 0 ? netUnits / unitsStaked : null,
    avgOdds: averageAmericanOdds(settled.filter(isGraded).map((p) => p.odds)),
    streak: { type: streakType, length: streakLen },
    bestPeriod: best ? { label: labelMonth(best[0]), net: best[1] } : null,
    worstPeriod: worst ? { label: labelMonth(worst[0]), net: worst[1] } : null,
    maxDrawdown: maxDd,
    longestWinStreak: longestW,
    longestLossStreak: longestL,
  };
}

export type Granularity = "daily" | "weekly" | "monthly";
export type RangeKey = "7d" | "30d" | "90d" | "all";

export interface SeriesPoint {
  date: string; // ISO day
  label: string;
  net: number; // period net
  cumulative: number;
  picks: number;
}

function bucketKey(iso: string, g: Granularity) {
  const d = new Date(iso);
  if (g === "daily") return d.toISOString().slice(0, 10);
  if (g === "monthly") return `${d.toISOString().slice(0, 7)}-01`;
  // weekly: Monday
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

export function filterRange(picks: Pick[], range: RangeKey, now = new Date()) {
  if (range === "all") return picks;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 86400000);
  return picks.filter((p) => new Date(p.settledAt ?? p.startTime) >= cutoff);
}

export function cumulativeSeries(picks: Pick[], granularity: Granularity = "daily"): SeriesPoint[] {
  const settled = sortBySettled(picks.filter(isSettled));
  const buckets = new Map<string, { net: number; picks: number }>();
  for (const p of settled) {
    const k = bucketKey(p.settledAt ?? p.startTime, granularity);
    const b = buckets.get(k) ?? { net: 0, picks: 0 };
    b.net = round2(b.net + p.netUnits);
    b.picks++;
    buckets.set(k, b);
  }
  let cum = 0;
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => {
      cum = round2(cum + b.net);
      const d = new Date(`${date}T00:00:00Z`);
      const label =
        granularity === "monthly"
          ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      return { date, label, net: b.net, cumulative: cum, picks: b.picks };
    });
}

export function statsBySport(picks: Pick[]) {
  const map = new Map<SportKey, Pick[]>();
  for (const p of picks) map.set(p.sport, [...(map.get(p.sport) ?? []), p]);
  return [...map.entries()].map(([sport, list]) => ({ sport, stats: computeStats(list) }));
}

export function statsByBetType(picks: Pick[]) {
  const map = new Map<BetTypeKey, Pick[]>();
  for (const p of picks) map.set(p.betType, [...(map.get(p.betType) ?? []), p]);
  return [...map.entries()].map(([betType, list]) => ({ betType, stats: computeStats(list) }));
}

/** Hypothetical dollar value of following every settled pick at a flat unit size. */
export function hypotheticalDollars(netUnits: number, unitSize: number) {
  return round2(netUnits * unitSize);
}

export { profitMultiplier };
