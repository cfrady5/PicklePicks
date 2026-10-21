import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { computeStats, isSettled, statsByBetType } from "@/lib/stats";
import { PageHeader, Section } from "@/components/layout/section";
import { StatsGrid } from "@/components/results/stats-grid";
import { ProfitChart } from "@/components/results/profit-chart";
import { SportsBreakdown } from "@/components/results/sports-breakdown";
import { PicksTable } from "@/components/results/picks-table";
import { Badge } from "@/components/ui/badge";
import { BET_TYPES, BRAND_COPY } from "@/lib/constants";
import { formatUnits, formatPct, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Results — The Pickle's Record", description: "Every published pick, settled on a public ledger. Wins, losses, pushes, drawdowns and streaks — nothing hidden." };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const repo = getRepo();
  const demo = isDemoMode();
  const picks = await repo.listPublicPicks();
  const settled = picks.filter(isSettled);
  const stats = computeStats(picks);
  const byType = statsByBetType(settled).sort((a, b) => b.stats.settled - a.stats.settled);
  const lastUpdated = settled.map((p) => p.settledAt!).sort().at(-1);

  return (
    <>
      <PageHeader eyebrow="Public performance ledger" title={BRAND_COPY.record} subtitle="Every published pick — wins, losses, pushes, drawdowns and losing streaks. Stats are computed live from settled records; nothing is hand-entered.">
        <div className="flex flex-col items-start gap-2 text-xs text-muted lg:items-end">
          {demo && <Badge variant="demo">Demo data — generated sample ledger</Badge>}
          <span>Last settlement: {lastUpdated ? new Date(lastUpdated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "none yet"}</span>
          <span>Longest win streak {stats.longestWinStreak} · longest losing streak {stats.longestLossStreak}</span>
        </div>
      </PageHeader>

      <Section className="py-10 lg:py-12">
        <StatsGrid stats={stats} />
      </Section>

      <Section className="py-4 lg:py-6" eyebrow="Interactive" title="Cumulative units" subtitle="Filter by range, sport and bet type. Aggregate daily, weekly or monthly. Hover for period detail.">
        <ProfitChart picks={settled} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="card rounded-2xl p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-muted">Best month</div><div className="mt-1 font-display text-xl font-extrabold text-win">{stats.bestPeriod ? `${formatUnits(stats.bestPeriod.net)}u` : "—"}</div><div className="text-xs text-muted">{stats.bestPeriod?.label ?? "Not enough data"}</div></div>
          <div className="card rounded-2xl p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-muted">Worst month</div><div className="mt-1 font-display text-xl font-extrabold text-loss">{stats.worstPeriod ? `${formatUnits(stats.worstPeriod.net)}u` : "—"}</div><div className="text-xs text-muted">{stats.worstPeriod?.label ?? "Not enough data"}</div></div>
          <div className="card rounded-2xl p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-muted">Max drawdown</div><div className="mt-1 font-display text-xl font-extrabold text-loss">{stats.settled ? `${formatUnits(stats.maxDrawdown)}u` : "—"}</div><div className="text-xs text-muted">Largest peak-to-trough decline</div></div>
        </div>
      </Section>

      <Section eyebrow="By sport" title="Sports breakdown" subtitle="Win rate, net units, ROI and volume for each league we cover.">
        <SportsBreakdown picks={settled} />
        {byType.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">By bet type</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byType.map(({ betType, stats: s }) => (
                <div key={betType} className="card flex items-center justify-between rounded-xl px-4 py-3">
                  <div><div className="font-semibold">{BET_TYPES.find((b) => b.key === betType)?.label ?? betType}</div><div className="text-xs text-muted">{s.wins}-{s.losses}{s.pushes ? `-${s.pushes}` : ""} · {formatPct(s.winRate)}</div></div>
                  <div className={cn("tabular font-display text-lg font-extrabold", s.netUnits > 0 ? "text-win" : s.netUnits < 0 ? "text-loss" : "")}>{formatUnits(s.netUnits)}u</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section eyebrow="Full ledger" title="Historical picks" subtitle="Searchable and sortable. The original selection, odds and stake are frozen at publication and cannot be edited afterwards — click any row for its audit trail.">
        <PicksTable picks={picks} />
        <p className="mt-4 text-xs text-muted-2">
          Units are a stake-size abstraction (1u = your chosen bet size). Results reflect the published odds at the listed sportsbook at publication time; the odds you receive may differ. See <Link href="/how-it-works" className="text-brand underline">how settlement works</Link>.
        </p>
      </Section>
    </>
  );
}
