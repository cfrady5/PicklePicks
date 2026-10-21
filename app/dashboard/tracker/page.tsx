import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { trackerStats } from "@/lib/tracker-stats";
import { deleteTrackedBet } from "@/app/actions/member";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { TrackBetButton } from "@/components/dashboard/track-bet-dialog";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResultBadge } from "@/components/picks/status-badge";
import { SportBadge } from "@/components/picks/sport-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, formatOdds, formatPct, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Pick Tracker" };

export default async function TrackerPage() {
  const user = await requireUser("/dashboard/tracker");
  const repo = getRepo();
  const [ent, tracked, picks] = await Promise.all([getEntitlement(), repo.listTrackedBets(user.id), repo.listPublicPicks()]);
  const byId = new Map(picks.map((p) => [p.id, p]));
  const s = trackerStats(tracked);
  const recentUntracked = ent.isSubscriber ? picks.filter((p) => !tracked.some((t) => t.pickId === p.id)).slice(0, 6) : [];

  return (
    <>
      <DashTitle eyebrow="Your bets, your numbers" title="My Pick Tracker" subtitle="Log the recommendations you actually followed with the odds, stake and book you used. These figures are yours alone — they are never mixed with the service's unit-based record.">
        <Badge variant="outline">Actual stakes you entered</Badge>
      </DashTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Net profit / loss" value={s.total ? formatMoney(s.net, { sign: true }) : "—"} tone={s.net > 0 ? "text-win" : s.net < 0 ? "text-loss" : ""} />
        <StatTile label="Total staked" value={s.total ? formatMoney(s.staked) : "—"} />
        <StatTile label="ROI" value={s.roi === null ? "—" : `${s.roi > 0 ? "+" : ""}${(s.roi * 100).toFixed(1)}%`} tone={(s.roi ?? 0) > 0 ? "text-win" : (s.roi ?? 0) < 0 ? "text-loss" : ""} />
        <StatTile label="Win rate" value={formatPct(s.winRate)} sub={`${s.wins}-${s.losses}${s.pushes ? `-${s.pushes}` : ""} · ${s.pending} pending`} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Logged bets</h2>
        <Table>
          <THead><TR><TH>Date</TH><TH>Pick</TH><TH className="text-right">Odds got</TH><TH className="text-right">Stake</TH><TH>Book</TH><TH>Result</TH><TH className="text-right">Net</TH><TH /></TR></THead>
          <TBody>
            {tracked.map((t) => {
              const p = byId.get(t.pickId);
              return (
                <TR key={t.id}>
                  <TD className="whitespace-nowrap text-muted">{formatDate(t.createdAt)}</TD>
                  <TD>{p ? <Link href={`/picks/${p.id}`} className="hover:text-brand"><span className="mr-2"><SportBadge sport={p.sport} /></span><span className="font-semibold">{p.selection}</span><div className="text-xs text-muted">{p.matchup} · published {formatOdds(p.odds)}</div></Link> : <span className="text-muted">Unknown pick</span>}</TD>
                  <TD className="tabular text-right">{formatOdds(t.oddsReceived)}</TD>
                  <TD className="tabular text-right">{formatMoney(t.stakeAmount)}</TD>
                  <TD>{t.sportsbook || "—"}</TD>
                  <TD><ResultBadge result={t.result} /></TD>
                  <TD className={cn("tabular text-right font-bold", t.netAmount > 0 ? "text-win" : t.netAmount < 0 ? "text-loss" : "text-muted")}>{t.result === "pending" ? "—" : formatMoney(t.netAmount, { sign: true })}</TD>
                  <TD className="whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      {p && <TrackBetButton pick={p} tracked existing={t} />}
                      <form action={deleteTrackedBet}><input type="hidden" name="id" value={t.id} /><button type="submit" aria-label="Delete tracked bet" className="rounded-lg p-2 text-muted hover:bg-loss/10 hover:text-loss"><Trash2 className="h-4 w-4" /></button></form>
                    </div>
                  </TD>
                </TR>
              );
            })}
            {tracked.length === 0 && <TR><TD colSpan={8} className="py-10 text-center text-muted">Nothing logged yet. Use &ldquo;I tailed this&rdquo; on any pick, or add one from the list below.</TD></TR>}
          </TBody>
        </Table>
      </section>

      {recentUntracked.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 font-display text-lg font-bold">Recent picks you haven&rsquo;t logged</h2>
          <p className="mb-3 text-xs text-muted-2">Only log bets you actually placed.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recentUntracked.map((p) => (
              <li key={p.id} className="card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                <div className="min-w-0"><div className="flex items-center gap-2"><SportBadge sport={p.sport} /><ResultBadge result={p.result} status={p.status} /></div><div className="mt-1 truncate text-sm font-semibold">{p.selection}</div><div className="text-xs text-muted">{p.matchup} · {formatOdds(p.odds)}</div></div>
                <TrackBetButton pick={p} tracked={false} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
