import Link from "next/link";
import { ArrowUpRight, Trophy, Percent, Coins, TrendingUp } from "lucide-react";
import type { PerformanceStats } from "@/lib/stats";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const MIN_SAMPLE = 10;

export function StatsRow({ stats, demo }: { stats: PerformanceStats; demo: boolean }) {
  const enough = stats.settled >= MIN_SAMPLE;
  const items = [
    { label: "Total Recorded Wins", icon: Trophy, value: stats.wins, fmt: "int" as const, ok: stats.settled > 0, tone: "text-text" },
    { label: "Historical Win Rate", icon: Percent, value: (stats.winRate ?? 0) * 100, fmt: "pct" as const, ok: enough && stats.winRate !== null, tone: "text-text" },
    { label: "Net Units Won/Lost", icon: Coins, value: stats.netUnits, fmt: "units" as const, ok: enough, tone: stats.netUnits > 0 ? "text-win" : stats.netUnits < 0 ? "text-loss" : "text-text" },
    { label: "Historical ROI", icon: TrendingUp, value: (stats.roi ?? 0) * 100, fmt: "signedPct" as const, ok: enough && stats.roi !== null, tone: (stats.roi ?? 0) > 0 ? "text-win" : (stats.roi ?? 0) < 0 ? "text-loss" : "text-text" },
  ];
  return (
    <section className="relative mx-auto -mt-4 max-w-7xl px-4 sm:px-6" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">Performance statistics</h2>
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((it) => (
          <StaggerItem key={it.label}>
            <div className="card group relative overflow-hidden rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{it.label}</span>
                <it.icon className="h-4 w-4 text-brand/70" />
              </div>
              <div className={cn("tabular mt-3 font-display text-3xl font-extrabold sm:text-4xl", it.ok ? it.tone : "text-muted-2")}>
                {it.ok ? <AnimatedNumber value={it.value} format={it.fmt} /> : <span className="text-base font-semibold">Not yet available</span>}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-2">
                {it.ok ? `From ${stats.settled} settled picks${demo ? " · demo data" : ""}` : `Needs ${MIN_SAMPLE}+ settled picks`}
              </div>
              <div aria-hidden className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-brand/10 blur-2xl opacity-0 transition group-hover:opacity-100" />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-4 flex justify-center">
        <Link href="/results" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand hover:underline">
          View the full, unfiltered results ledger <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
