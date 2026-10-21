import type { PerformanceStats } from "@/lib/stats";
import { formatOdds, formatPct, formatUnits, cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/tooltip";

export function StatsGrid({ stats, className }: { stats: PerformanceStats; className?: string }) {
  const streak = stats.streak.type ? `${stats.streak.type}${stats.streak.length}` : "—";
  const cells: { label: string; value: string; tone?: string; tip?: string }[] = [
    { label: "Total Picks", value: stats.totalPicks.toLocaleString(), tip: "All published picks, including pending." },
    { label: "Wins", value: stats.wins.toLocaleString(), tone: "text-win" },
    { label: "Losses", value: stats.losses.toLocaleString(), tone: "text-loss" },
    { label: "Pushes", value: stats.pushes.toLocaleString(), tone: "text-push", tip: "Pushes and voids return the stake and count as 0 net units." },
    { label: "Win %", value: formatPct(stats.winRate), tip: "Wins ÷ (Wins + Losses). Pushes excluded." },
    { label: "Units Staked", value: `${stats.unitsStaked.toFixed(2)}u` },
    { label: "Net Units", value: stats.settled ? `${formatUnits(stats.netUnits)}u` : "—", tone: stats.netUnits > 0 ? "text-win" : stats.netUnits < 0 ? "text-loss" : undefined },
    { label: "ROI", value: stats.roi === null ? "—" : `${stats.roi > 0 ? "+" : ""}${(stats.roi * 100).toFixed(1)}%`, tone: (stats.roi ?? 0) > 0 ? "text-win" : (stats.roi ?? 0) < 0 ? "text-loss" : undefined, tip: "Net units ÷ units staked on graded picks." },
    { label: "Avg Odds", value: stats.avgOdds === null ? "—" : formatOdds(stats.avgOdds), tip: "Mean of decimal odds, shown in American format." },
    { label: "Current Streak", value: streak, tone: stats.streak.type === "W" ? "text-win" : stats.streak.type === "L" ? "text-loss" : undefined },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {cells.map((c) => (
        <div key={c.label} className="card rounded-2xl px-4 py-4">
          <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-muted">{c.label}{c.tip && <InfoTip>{c.tip}</InfoTip>}</div>
          <div className={cn("tabular mt-2 font-display text-2xl font-extrabold sm:text-[1.65rem]", c.tone)}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
