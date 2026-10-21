"use client";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Pick } from "@/lib/data/types";
import { cumulativeSeries, filterRange, type Granularity, type RangeKey, computeStats } from "@/lib/stats";
import { SPORTS, BET_TYPES } from "@/lib/constants";
import { Segmented } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { formatUnits, cn } from "@/lib/utils";

export function ProfitChart({ picks, title = "Cumulative net units", showFilters = true, height = 320 }: { picks: Pick[]; title?: string; showFilters?: boolean; height?: number }) {
  const [range, setRange] = React.useState<RangeKey>("all");
  const [gran, setGran] = React.useState<Granularity>("daily");
  const [sport, setSport] = React.useState("all");
  const [betType, setBetType] = React.useState("all");

  const filtered = React.useMemo(() => {
    let list = picks;
    if (sport !== "all") list = list.filter((p) => p.sport === sport);
    if (betType !== "all") list = list.filter((p) => p.betType === betType);
    return filterRange(list, range);
  }, [picks, sport, betType, range]);

  const series = React.useMemo(() => cumulativeSeries(filtered, gran), [filtered, gran]);
  const stats = React.useMemo(() => computeStats(filtered), [filtered]);
  const last = series.at(-1)?.cumulative ?? 0;
  const positive = last >= 0;
  const min = Math.min(0, ...series.map((s) => s.cumulative));
  const max = Math.max(0, ...series.map((s) => s.cumulative));
  const off = max === min ? 0.5 : max / (max - min);

  return (
    <div className="card rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn("tabular font-display text-3xl font-extrabold", positive ? "text-win" : "text-loss")}>{series.length ? `${formatUnits(last)}u` : "—"}</span>
            <span className="text-xs text-muted">{stats.settled} settled · {stats.wins}-{stats.losses}{stats.pushes ? `-${stats.pushes}` : ""} · max drawdown {formatUnits(stats.maxDrawdown)}u</span>
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={range} onChange={setRange} options={[{ value: "7d", label: "7D" }, { value: "30d", label: "30D" }, { value: "90d", label: "90D" }, { value: "all", label: "All" }]} />
            <Segmented value={gran} onChange={setGran} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
            <Select value={sport} onChange={(e) => setSport(e.target.value)} className="h-9 w-auto py-0 text-xs" aria-label="Filter by sport">
              <option value="all">All sports</option>
              {SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <Select value={betType} onChange={(e) => setBetType(e.target.value)} className="h-9 w-auto py-0 text-xs" aria-label="Filter by bet type">
              <option value="all">All bet types</option>
              {BET_TYPES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </Select>
          </div>
        )}
      </div>
      <div className="mt-4" style={{ height }}>
        {series.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">Not enough settled picks in this range to chart.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="#8dff32" stopOpacity={0.45} />
                  <stop offset={off} stopColor="#8dff32" stopOpacity={0.04} />
                  <stop offset={off} stopColor="#f06464" stopOpacity={0.04} />
                  <stop offset={1} stopColor="#f06464" stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={off} stopColor="#8dff32" />
                  <stop offset={off} stopColor="#f06464" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#22382b" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a69a", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis tick={{ fill: "#94a69a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}u`} width={56} />
              <ReferenceLine y={0} stroke="#94a69a" strokeOpacity={0.5} />
              <Tooltip
                cursor={{ stroke: "#8dff32", strokeOpacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof series)[number];
                  return (
                    <div className="rounded-lg border border-border-strong bg-card-2 px-3 py-2 text-xs shadow-xl">
                      <div className="font-semibold text-text">{d.label}</div>
                      <div className="mt-1 tabular text-muted">Period: <span className={d.net >= 0 ? "text-win" : "text-loss"}>{formatUnits(d.net)}u</span> · {d.picks} pick{d.picks === 1 ? "" : "s"}</div>
                      <div className="tabular text-muted">Cumulative: <span className={d.cumulative >= 0 ? "text-win" : "text-loss"}>{formatUnits(d.cumulative)}u</span></div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="cumulative" stroke="url(#splitStroke)" strokeWidth={2.5} fill="url(#splitFill)" isAnimationActive animationDuration={900} dot={false} activeDot={{ r: 4, fill: "#8dff32", stroke: "#080d0a" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-2">Green above zero, red below. Includes every settled pick in the selected range — losing periods and drawdowns are not hidden.</p>
    </div>
  );
}
