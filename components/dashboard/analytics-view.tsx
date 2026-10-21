"use client";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Pick, TrackedBet } from "@/lib/data/types";
import { computeStats, statsBySport, statsByBetType, isSettled, cumulativeSeries, hypotheticalDollars } from "@/lib/stats";
import { trackerStats } from "@/lib/tracker-stats";
import { UNIT_SIZES, SPORTS, BET_TYPES } from "@/lib/constants";
import { ProfitChart } from "@/components/results/profit-chart";
import { Segmented } from "@/components/ui/tabs";
import { StatTile } from "@/components/dashboard/page-title";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatPct, formatUnits, cn } from "@/lib/utils";

export function AnalyticsView({ picks, tracked }: { picks: Pick[]; tracked: TrackedBet[] }) {
  const [unit, setUnit] = React.useState<(typeof UNIT_SIZES)[number]>(25);
  const settled = React.useMemo(() => picks.filter(isSettled), [picks]);
  const service = React.useMemo(() => computeStats(picks), [picks]);
  const mine = React.useMemo(() => trackerStats(tracked), [tracked]);
  const bySport = React.useMemo(() => statsBySport(settled).filter((s) => s.stats.settled > 0).sort((a, b) => b.stats.netUnits - a.stats.netUnits), [settled]);
  const byType = React.useMemo(() => statsByBetType(settled).filter((s) => s.stats.settled > 0).sort((a, b) => b.stats.netUnits - a.stats.netUnits), [settled]);
  const monthly = React.useMemo(() => cumulativeSeries(settled, "monthly"), [settled]);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Your actual results</h2><p className="text-xs text-muted-2">Computed only from bets you logged in the tracker, at the odds and stakes you entered.</p></div>
          <Badge variant="outline">Real stakes you entered</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Net profit / loss" value={mine.total ? formatMoney(mine.net, { sign: true }) : "—"} tone={mine.net > 0 ? "text-win" : mine.net < 0 ? "text-loss" : ""} sub={`${mine.wins}-${mine.losses}${mine.pushes ? `-${mine.pushes}` : ""} · ${mine.pending} pending`} />
          <StatTile label="Total staked" value={mine.total ? formatMoney(mine.staked) : "—"} sub="On graded bets" />
          <StatTile label="ROI" value={mine.roi === null ? "—" : `${mine.roi > 0 ? "+" : ""}${(mine.roi * 100).toFixed(1)}%`} tone={(mine.roi ?? 0) > 0 ? "text-win" : (mine.roi ?? 0) < 0 ? "text-loss" : ""} />
          <StatTile label="Win rate" value={formatPct(mine.winRate)} sub={`${mine.total} tracked bet${mine.total === 1 ? "" : "s"}`} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Hypothetical value of the service&rsquo;s picks</h2><p className="text-xs text-muted-2">What following every settled pick at a flat unit size would have returned. Hypothetical — not your winnings and not a prediction.</p></div>
          <div className="flex items-center gap-2 text-xs text-muted">1 unit =<Segmented value={String(unit)} onChange={(v) => setUnit(Number(v) as (typeof UNIT_SIZES)[number])} options={UNIT_SIZES.map((u) => ({ value: String(u), label: `$${u}` }))} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Hypothetical net" value={service.settled ? formatMoney(hypotheticalDollars(service.netUnits, unit), { sign: true }) : "—"} tone={service.netUnits > 0 ? "text-win" : service.netUnits < 0 ? "text-loss" : ""} sub={`${formatUnits(service.netUnits)}u × $${unit}`} />
          <StatTile label="Hypothetical staked" value={service.settled ? formatMoney(service.unitsStaked * unit) : "—"} sub={`${service.unitsStaked.toFixed(1)}u × $${unit}`} />
          <StatTile label="Best month" value={service.bestPeriod ? formatMoney(hypotheticalDollars(service.bestPeriod.net, unit), { sign: true }) : "—"} tone="text-win" sub={service.bestPeriod?.label} />
          <StatTile label="Worst month" value={service.worstPeriod ? formatMoney(hypotheticalDollars(service.worstPeriod.net, unit), { sign: true }) : "—"} tone="text-loss" sub={service.worstPeriod?.label} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Max drawdown" value={service.settled ? `${formatUnits(service.maxDrawdown)}u` : "—"} tone="text-loss" sub={service.settled ? formatMoney(hypotheticalDollars(service.maxDrawdown, unit), { sign: true }) : undefined} />
          <StatTile label="Longest win streak" value={String(service.longestWinStreak)} tone="text-win" />
          <StatTile label="Longest losing streak" value={String(service.longestLossStreak)} tone="text-loss" />
        </div>
      </section>

      <ProfitChart picks={settled} title="Service cumulative net units" />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card rounded-2xl p-5">
          <h3 className="font-display text-base font-bold">Net units by month</h3>
          <div className="mt-3 h-56">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#22382b" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#94a69a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a69a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#1b2d22", border: "1px solid #2f4b3a", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#f7fff4" }} formatter={(v) => [`${formatUnits(Number(v))}u`, "Net"]} />
                  <Bar dataKey="net" radius={[6, 6, 0, 0]}>{monthly.map((m) => <Cell key={m.date} fill={m.net >= 0 ? "#8dff32" : "#f06464"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted">No settled picks yet.</div>}
          </div>
        </div>
        <div className="card rounded-2xl p-5">
          <h3 className="font-display text-base font-bold">Results by sport &amp; bet type</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ul className="space-y-1.5 text-sm">
              <li className="text-[10px] font-bold uppercase tracking-wider text-muted">Sport</li>
              {bySport.map(({ sport, stats }) => (
                <li key={sport} className="flex items-center justify-between"><span>{SPORTS.find((s) => s.key === sport)?.label} <span className="text-xs text-muted">({stats.wins}-{stats.losses})</span></span><span className={cn("tabular font-bold", stats.netUnits > 0 ? "text-win" : stats.netUnits < 0 ? "text-loss" : "")}>{formatUnits(stats.netUnits)}u</span></li>
              ))}
            </ul>
            <ul className="space-y-1.5 text-sm">
              <li className="text-[10px] font-bold uppercase tracking-wider text-muted">Bet type</li>
              {byType.map(({ betType, stats }) => (
                <li key={betType} className="flex items-center justify-between"><span>{BET_TYPES.find((b) => b.key === betType)?.label} <span className="text-xs text-muted">({stats.wins}-{stats.losses})</span></span><span className={cn("tabular font-bold", stats.netUnits > 0 ? "text-win" : stats.netUnits < 0 ? "text-loss" : "")}>{formatUnits(stats.netUnits)}u</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
