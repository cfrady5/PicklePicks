import type { Pick } from "@/lib/data/types";
import { SPORTS } from "@/lib/constants";
import { computeStats } from "@/lib/stats";
import { formatPct, formatUnits, cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

export function SportsBreakdown({ picks }: { picks: Pick[] }) {
  return (
    <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SPORTS.map((s) => {
        const list = picks.filter((p) => p.sport === s.key);
        const st = computeStats(list);
        const has = st.settled > 0;
        return (
          <StaggerItem key={s.key}>
            <div className={cn("card h-full rounded-2xl p-5", !has && "opacity-70")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-xl" aria-hidden>{s.emoji}</span><span className="font-display font-bold">{s.label}</span></div>
                <span className="text-xs text-muted">{st.settled} pick{st.settled === 1 ? "" : "s"}</span>
              </div>
              {has ? (
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Win %</dt><dd className="tabular mt-1 font-display text-lg font-extrabold">{formatPct(st.winRate)}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Net</dt><dd className={cn("tabular mt-1 font-display text-lg font-extrabold", st.netUnits > 0 ? "text-win" : st.netUnits < 0 ? "text-loss" : "")}>{formatUnits(st.netUnits)}u</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wider text-muted">ROI</dt><dd className={cn("tabular mt-1 font-display text-lg font-extrabold", (st.roi ?? 0) > 0 ? "text-win" : (st.roi ?? 0) < 0 ? "text-loss" : "")}>{st.roi === null ? "—" : `${st.roi > 0 ? "+" : ""}${(st.roi * 100).toFixed(1)}%`}</dd></div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-muted-2">No settled picks yet.</p>
              )}
              <div className="mt-3 text-[11px] text-muted-2">{st.wins}-{st.losses}{st.pushes ? `-${st.pushes}` : ""}</div>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
