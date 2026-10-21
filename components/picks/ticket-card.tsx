import Link from "next/link";
import type { Pick } from "@/lib/data/types";
import { BET_TYPES } from "@/lib/constants";
import { cn, formatDate, formatOdds, formatUnits } from "@/lib/utils";
import { SportBadge } from "./sport-badge";
import { ResultBadge } from "./status-badge";

/** Sportsbook-style bet slip for a settled pick. */
export function TicketCard({ pick, className, flash = false, compact = false }: { pick: Pick; className?: string; flash?: boolean; compact?: boolean }) {
  const won = pick.result === "win";
  const lost = pick.result === "loss";
  const betType = BET_TYPES.find((b) => b.key === pick.betType)?.label ?? pick.betType;
  return (
    <Link
      href={`/picks/${pick.id}`}
      className={cn(
        "ticket-edge group relative block w-[300px] shrink-0 overflow-hidden rounded-2xl border bg-gradient-to-b from-card-2 to-card transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1",
        won ? "border-brand/35 shadow-[0_0_30px_-12px_rgba(141,255,50,0.6)]" : lost ? "border-loss/25" : "border-border",
        flash && won && "flash-win",
        className,
      )}
      aria-label={`${pick.sport} ${pick.selection}, ${pick.result}, ${formatUnits(pick.netUnits)} units`}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5">
        <div className="flex items-center gap-2">
          <SportBadge sport={pick.sport} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{betType}</span>
        </div>
        <ResultBadge result={pick.result} status={pick.status} />
      </div>
      <div className="px-4 pb-3 pt-2.5">
        <div className="text-xs text-muted">{pick.matchup}</div>
        <div className="mt-1 font-display text-[15px] font-bold leading-snug text-text">{pick.selection}</div>
        {!compact && (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-muted-2">Odds</dt><dd className="tabular font-semibold">{formatOdds(pick.odds)}</dd></div>
            <div><dt className="text-muted-2">Stake</dt><dd className="tabular font-semibold">{pick.stake.toFixed(1)}u</dd></div>
            <div><dt className="text-muted-2">Book</dt><dd className="truncate font-semibold">{pick.sportsbook}</dd></div>
          </dl>
        )}
      </div>
      <div className="mx-4 border-t border-dashed border-border-strong" />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted">{formatDate(pick.settledAt ?? pick.startTime)}{pick.isDemo && <span className="rounded border border-pending/40 px-1 text-[9px] font-bold uppercase tracking-wider text-pending" title="Generated sample record for development">Demo</span>}</div>
        <div className={cn("tabular font-display text-base font-extrabold", won ? "text-win" : lost ? "text-loss" : "text-push")}>
          {pick.result === "pending" ? "—" : `${formatUnits(pick.netUnits)}u`}
        </div>
      </div>
      {won && <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/20 blur-2xl transition-opacity group-hover:opacity-100" />}
    </Link>
  );
}
