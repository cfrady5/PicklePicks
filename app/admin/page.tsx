import Link from "next/link";
import { PlusCircle, ArrowRight, Clock } from "lucide-react";
import { getRepo } from "@/lib/data";
import { computeStats } from "@/lib/stats";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { ResultBadge } from "@/components/picks/status-badge";
import { SportBadge } from "@/components/picks/sport-badge";
import { formatDateTime, formatOdds, formatUnits } from "@/lib/utils";
import { ReleaseButton } from "@/components/admin/release-button";

export default async function AdminOverview() {
  const repo = getRepo();
  const [picks, subs, profiles, plans] = await Promise.all([repo.listAllPicks(), repo.listSubscriptions(), repo.listProfiles(), repo.listPlans()]);
  const stats = computeStats(picks);
  const needsSettle = picks.filter((p) => p.status === "published" && new Date(p.startTime) < new Date()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const scheduled = picks.filter((p) => p.status === "scheduled");
  const drafts = picks.filter((p) => p.status === "draft");
  const active = subs.filter((s) => s.status === "active" && new Date(s.currentPeriodEnd) > new Date());
  const mrr = active.reduce((a, s) => { const p = plans.find((x) => x.key === s.planKey); if (!p) return a; const monthly = p.interval === "month" ? p.priceCents : p.interval === "week" ? p.priceCents * 4.33 : 0; return a + monthly; }, 0) / 100;

  return (
    <>
      <DashTitle eyebrow="Control center" title="The Pickle Board" subtitle="Publish, settle, and keep the record honest.">
        <div className="flex gap-2"><ReleaseButton count={scheduled.filter((p) => p.scheduledFor && new Date(p.scheduledFor) <= new Date()).length} /><Button asChild><Link href="/admin/picks/new"><PlusCircle className="h-4 w-4" /> New pick</Link></Button></div>
      </DashTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Awaiting settlement" value={String(needsSettle.length)} sub="Published, game started" tone={needsSettle.length ? "text-pending" : ""} />
        <StatTile label="Scheduled / drafts" value={`${scheduled.length} / ${drafts.length}`} />
        <StatTile label="Active subscribers" value={String(active.length)} sub={`${profiles.length} total accounts · ~$${mrr.toFixed(0)} MRR`} />
        <StatTile label="Service record" value={`${stats.wins}-${stats.losses}${stats.pushes ? `-${stats.pushes}` : ""}`} sub={`${formatUnits(stats.netUnits)}u · ROI ${stats.roi === null ? "—" : `${(stats.roi * 100).toFixed(1)}%`}`} tone={stats.netUnits >= 0 ? "text-win" : "text-loss"} />
      </div>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Needs settlement</h2><Link href="/admin/picks?status=published" className="text-xs font-semibold text-brand hover:underline">All published <ArrowRight className="inline h-3 w-3" /></Link></div>
        <ul className="space-y-2">
          {needsSettle.slice(0, 8).map((p) => (
            <li key={p.id}><Link href={`/admin/picks/${p.id}`} className="card flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:border-brand/40">
              <div className="min-w-0"><div className="flex items-center gap-2"><SportBadge sport={p.sport} /><ResultBadge result={p.result} status={p.status} /></div><div className="mt-1 truncate font-semibold">{p.selection} <span className="text-muted">({formatOdds(p.odds)}, {p.stake}u)</span></div><div className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {p.matchup} · {formatDateTime(p.startTime)}</div></div>
              <Button size="sm" variant="outline">Settle</Button>
            </Link></li>
          ))}
          {needsSettle.length === 0 && <li className="card rounded-xl p-8 text-center text-sm text-muted">Nothing waiting. The ledger is up to date.</li>}
        </ul>
      </section>
    </>
  );
}
