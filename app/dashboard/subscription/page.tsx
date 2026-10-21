import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { billingStatus } from "@/lib/billing";
import { cancelSubscription, openBillingPortal } from "@/app/actions/billing";
import { DashTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PricingCards } from "@/components/home/pricing-cards";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ canceled?: string; portal?: string }> }) {
  const { canceled, portal } = await searchParams;
  const user = await requireUser("/dashboard/subscription");
  const repo = getRepo();
  const [ent, plans, billing] = await Promise.all([getEntitlement(), repo.listPlans(), repo.listBillingEvents(user.id)]);
  const sub = ent.subscription;
  const plan = sub ? plans.find((p) => p.key === sub.planKey) : null;
  const status = billingStatus();

  return (
    <>
      <DashTitle eyebrow="Billing" title="Subscription" subtitle="Manage your plan, see renewal dates and review every charge." />
      {canceled && <div className="mb-6 rounded-xl border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-pending">Your subscription has been set to cancel. Access continues through the end of the current period.</div>}
      {portal && <div className="mb-6 rounded-xl border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-pending">The payment provider portal isn&rsquo;t available until live billing is enabled. You can still cancel below.</div>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Current plan</div>
              <div className="mt-1 font-display text-2xl font-extrabold">{ent.isAdmin && !sub ? "Staff access" : plan?.name ?? "No active plan"}</div>
            </div>
            {sub && <Badge variant={sub.cancelAtPeriodEnd ? "pending" : "win"}>{sub.cancelAtPeriodEnd ? "Cancels at period end" : sub.status}</Badge>}
          </div>
          {sub ? (
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted">Price</dt><dd className="font-semibold">{plan ? `${formatMoney(plan.priceCents / 100)} / ${plan.interval}` : "—"}</dd></div>
              <div><dt className="text-xs text-muted">Provider</dt><dd className="font-semibold capitalize">{sub.provider}</dd></div>
              <div><dt className="text-xs text-muted">Current period</dt><dd className="font-semibold">{formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}</dd></div>
              <div><dt className="text-xs text-muted">{sub.cancelAtPeriodEnd || plan?.interval === "day" ? "Access ends" : "Renews"}</dt><dd className="font-semibold">{formatDate(sub.currentPeriodEnd)}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">{ent.isAdmin ? "Administrators have full access without a subscription." : "You don't have an active plan. Pick one below to open the jar."}</p>
          )}
          {sub && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              {status.approved && sub.provider === "stripe" && <form action={openBillingPortal}><Button variant="secondary" type="submit">Manage payment method</Button></form>}
              {!sub.cancelAtPeriodEnd && plan?.interval !== "day" && (
                <form action={cancelSubscription}><input type="hidden" name="mode" value="period_end" /><Button variant="danger" type="submit">Cancel at period end</Button></form>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-2">Renewal terms: weekly and monthly plans renew automatically until canceled; the Daily Pickle never renews. Cancel anytime; access continues through the paid period. <Link href="/legal/terms" className="underline">Full terms</Link>.</p>
        </section>
        <section className="card rounded-2xl p-6">
          <h2 className="font-display text-base font-bold">Billing history</h2>
          <div className="mt-3">
            <Table>
              <THead><TR><TH>Date</TH><TH>Description</TH><TH className="text-right">Amount</TH></TR></THead>
              <TBody>
                {billing.map((b) => <TR key={b.id}><TD className="whitespace-nowrap text-muted">{formatDateTime(b.createdAt)}</TD><TD>{b.description}</TD><TD className="tabular text-right">{formatMoney(b.amountCents / 100)}</TD></TR>)}
                {billing.length === 0 && <TR><TD colSpan={3} className="py-6 text-center text-muted">No charges yet.</TD></TR>}
              </TBody>
            </Table>
          </div>
        </section>
      </div>

      {!sub && !ent.isAdmin && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-extrabold">Choose a plan</h2>
          <PricingCards plans={plans} />
        </section>
      )}
    </>
  );
}
