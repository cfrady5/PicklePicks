import Link from "next/link";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { computeStats, isSettled } from "@/lib/stats";
import { trackerStats } from "@/lib/tracker-stats";
import { BRAND_COPY } from "@/lib/constants";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { PickCard } from "@/components/picks/pick-card";
import { Paywall } from "@/components/picks/paywall";
import { TicketCard } from "@/components/picks/ticket-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatMoney, formatPct, formatUnits, cn } from "@/lib/utils";
import { SportBadge } from "@/components/picks/sport-badge";

export default async function DashboardOverview({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const { welcome, denied } = await searchParams;
  const user = await requireUser("/dashboard");
  const repo = getRepo();
  const [ent, today, publicPicks, tracked, plans] = await Promise.all([getEntitlement(), repo.listTodaysPicks(), repo.listPublicPicks(), repo.listTrackedBets(user.id), repo.listPlans()]);
  const settled = publicPicks.filter(isSettled);
  const service = computeStats(publicPicks);
  const mine = trackerStats(tracked);
  const pending = publicPicks.filter((p) => p.status === "published");
  const latest = [...settled].sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? "")).slice(0, 4);
  const upcoming = pending.filter((p) => new Date(p.startTime) > new Date()).sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);
  const plan = ent.subscription ? plans.find((p) => p.key === ent.subscription!.planKey) : null;

  return (
    <>
      <DashTitle eyebrow={BRAND_COPY.board} title={BRAND_COPY.welcomeBack} subtitle={`Good to see you, ${user.displayName.split(" ")[0]}. Here's the state of the jar.`}>
        <Button asChild><Link href="/dashboard/picks"><Sparkles className="h-4 w-4" /> {BRAND_COPY.freshPicks}</Link></Button>
      </DashTitle>
      {welcome && <div className="mb-6 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">Welcome to the Pickle Jar! Your access is active.</div>}
      {denied && <div className="mb-6 rounded-xl border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">That area is for administrators only.</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card rounded-2xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Subscription</div>
          <div className="mt-1.5 font-display text-xl font-extrabold">{ent.isAdmin ? "Staff access" : plan?.name ?? "Free account"}</div>
          <div className="mt-0.5 text-xs text-muted-2">{ent.subscription ? `${ent.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} ${formatDate(ent.subscription.currentPeriodEnd)}` : ent.isAdmin ? "All areas unlocked" : <Link href="/pricing" className="text-brand underline">Open the jar</Link>}</div>
        </div>
        <StatTile label="Today's picks" value={String(today.length)} sub={today.length ? `${today.filter((p) => p.result === "pending").length} awaiting results` : "No picks published yet today"} />
        <StatTile label="Awaiting results" value={String(pending.length)} sub="Published, not yet settled" />
        <StatTile label="Service net units" value={service.settled ? `${formatUnits(service.netUnits)}u` : "—"} sub={`${service.wins}-${service.losses}${service.pushes ? `-${service.pushes}` : ""} · ROI ${service.roi === null ? "—" : `${service.roi > 0 ? "+" : ""}${(service.roi * 100).toFixed(1)}%`}`} tone={service.netUnits > 0 ? "text-win" : service.netUnits < 0 ? "text-loss" : ""} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Today&rsquo;s available picks</h2><Link href="/dashboard/picks" className="text-xs font-semibold text-brand hover:underline">All picks <ArrowRight className="inline h-3 w-3" /></Link></div>
          {!ent.isSubscriber ? (
            <Paywall count={today.filter((p) => p.result === "pending").length} compact />
          ) : today.length ? (
            <div className="space-y-3">{today.slice(0, 3).map((p) => <PickCard key={p.id} pick={p} />)}</div>
          ) : (
            <div className="card rounded-2xl p-8 text-center text-sm text-muted">No picks yet today. Fresh picks usually land a few hours before first pitch / tip-off.</div>
          )}
        </section>
        <aside className="space-y-6">
          <section className="card rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold">Your tracked units</h2><Badge variant="outline">Your bets</Badge></div>
            <p className="mt-1 text-xs text-muted-2">Based only on bets you logged — not the service&rsquo;s hypothetical results.</p>
            {mine.total ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Net P/L</dt><dd className={cn("tabular font-display text-xl font-extrabold", mine.net > 0 ? "text-win" : mine.net < 0 ? "text-loss" : "")}>{formatMoney(mine.net, { sign: true })}</dd></div>
                <div><dt className="text-xs text-muted">Staked</dt><dd className="tabular font-display text-xl font-extrabold">{formatMoney(mine.staked)}</dd></div>
                <div><dt className="text-xs text-muted">Record</dt><dd className="tabular font-semibold">{mine.wins}-{mine.losses}{mine.pushes ? `-${mine.pushes}` : ""}</dd></div>
                <div><dt className="text-xs text-muted">ROI</dt><dd className="tabular font-semibold">{mine.roi === null ? "—" : `${mine.roi > 0 ? "+" : ""}${(mine.roi * 100).toFixed(1)}%`} · {formatPct(mine.winRate)}</dd></div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">You haven&rsquo;t logged any bets yet. <Link href="/dashboard/tracker" className="text-brand underline">Start tracking</Link>.</p>
            )}
          </section>
          <section className="card rounded-2xl p-5">
            <h2 className="font-display text-base font-bold">Upcoming games</h2>
            <ul className="mt-3 space-y-2">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0"><div className="truncate font-semibold">{p.matchup}</div><div className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {formatDateTime(p.startTime)}</div></div>
                  <SportBadge sport={p.sport} showLabel={false} />
                </li>
              ))}
              {upcoming.length === 0 && <li className="text-sm text-muted-2">Nothing on the schedule right now.</li>}
            </ul>
          </section>
        </aside>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Latest settled picks</h2><Link href="/dashboard/history" className="text-xs font-semibold text-brand hover:underline">Full history <ArrowRight className="inline h-3 w-3" /></Link></div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">{latest.map((p) => <TicketCard key={p.id} pick={p} />)}</div>
      </section>
    </>
  );
}
