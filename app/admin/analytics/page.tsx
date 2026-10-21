import { getRepo } from "@/lib/data";
import { computeStats, isSettled } from "@/lib/stats";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { ProfitChart } from "@/components/results/profit-chart";
import { SportsBreakdown } from "@/components/results/sports-breakdown";
import { formatMoney, formatUnits } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  const repo = getRepo();
  const [picks, subs, plans, billing, profiles] = await Promise.all([repo.listAllPicks(), repo.listSubscriptions(), repo.listPlans(), repo.listBillingEvents(), repo.listProfiles()]);
  const settled = picks.filter(isSettled);
  const stats = computeStats(picks);
  const active = subs.filter((s) => s.status === "active" && new Date(s.currentPeriodEnd) > new Date());
  const byPlan = plans.map((p) => ({ plan: p, n: active.filter((s) => s.planKey === p.key).length }));
  const mrr = byPlan.reduce((a, { plan, n }) => a + n * (plan.interval === "month" ? plan.priceCents : plan.interval === "week" ? plan.priceCents * 4.33 : 0), 0) / 100;
  const paid = billing.filter((b) => b.amountCents > 0 && !b.type.startsWith("demo") && !b.type.startsWith("manual"));
  const lifetime = paid.reduce((a, b) => a + b.amountCents, 0) / 100;
  const conv = profiles.length ? active.length / profiles.length : 0;
  return (
    <>
      <DashTitle eyebrow="Business" title="Financial & subscription analytics" subtitle="Service performance alongside subscription health." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Est. MRR" value={formatMoney(mrr)} sub="Weekly plans normalised ×4.33" />
        <StatTile label="Lifetime revenue" value={formatMoney(lifetime)} sub={`${paid.length} paid events`} />
        <StatTile label="Active subscribers" value={String(active.length)} sub={`${(conv * 100).toFixed(0)}% of ${profiles.length} accounts`} />
        <StatTile label="Service net units" value={`${formatUnits(stats.netUnits)}u`} tone={stats.netUnits >= 0 ? "text-win" : "text-loss"} sub={`${stats.settled} settled · max DD ${formatUnits(stats.maxDrawdown)}u`} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{byPlan.map(({ plan, n }) => <StatTile key={plan.key} label={plan.name} value={String(n)} sub={`${formatMoney(plan.priceCents / 100)} / ${plan.interval}`} />)}</div>
      <div className="mt-8"><ProfitChart picks={settled} /></div>
      <div className="mt-8"><h2 className="mb-3 font-display text-lg font-bold">By sport</h2><SportsBreakdown picks={settled} /></div>
    </>
  );
}
