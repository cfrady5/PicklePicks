import { getRepo } from "@/lib/data";
import { adminCancelSubscription } from "@/app/actions/admin";
import { billingStatus } from "@/lib/billing";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 86400000);

export default async function AdminSubscriptionsPage() {
  const repo = getRepo();
  const [subs, profiles, plans, billing] = await Promise.all([repo.listSubscriptions(), repo.listProfiles(), repo.listPlans(), repo.listBillingEvents()]);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const status = billingStatus();
  const active = subs.filter((s) => s.status === "active" && new Date(s.currentPeriodEnd) > new Date());
  const revenue30 = billing.filter((b) => b.type.startsWith("invoice") || b.type.startsWith("checkout")).filter((b) => new Date(b.createdAt) > thirtyDaysAgo()).reduce((a, b) => a + b.amountCents, 0) / 100;
  return (
    <>
      <DashTitle eyebrow="Billing" title="Subscriptions" subtitle="Entitlements are checked server-side on every request.">
        <Badge variant={status.approved ? "win" : "demo"}>{status.demo ? "Demo billing" : status.approved ? `Live · ${status.provider}` : "Billing pending provider approval"}</Badge>
      </DashTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Active" value={String(active.length)} />
        <StatTile label="Cancelling at period end" value={String(active.filter((s) => s.cancelAtPeriodEnd).length)} />
        <StatTile label="Revenue (30d)" value={formatMoney(revenue30)} sub="From recorded billing events" />
      </div>
      {!status.approved && !status.demo && <p className="mt-4 rounded-xl border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-pending">Live billing is disabled. Set BILLING_PROVIDER_APPROVED=true only after the payment provider has approved the paid sports-picks business category in writing.</p>}
      <div className="mt-6">
        <Table>
          <THead><TR><TH>User</TH><TH>Plan</TH><TH>Status</TH><TH>Period</TH><TH>Provider</TH><TH /></TR></THead>
          <TBody>
            {subs.map((s) => (
              <TR key={s.id}>
                <TD><div className="font-semibold">{byId.get(s.userId)?.displayName ?? s.userId}</div><div className="text-xs text-muted">{byId.get(s.userId)?.email}</div></TD>
                <TD>{plans.find((p) => p.key === s.planKey)?.name ?? s.planKey}</TD>
                <TD><Badge variant={s.status === "active" ? "win" : s.status === "past_due" ? "pending" : "default"}>{s.status}{s.cancelAtPeriodEnd ? " · ends" : ""}</Badge></TD>
                <TD className="text-xs text-muted">{formatDate(s.currentPeriodStart)} – {formatDate(s.currentPeriodEnd)}</TD>
                <TD className="text-xs capitalize text-muted">{s.provider}</TD>
                <TD className="text-right">{s.status === "active" && <form action={adminCancelSubscription}><input type="hidden" name="userId" value={s.userId} /><Button size="sm" variant="danger" type="submit">Cancel now</Button></form>}</TD>
              </TR>
            ))}
            {subs.length === 0 && <TR><TD colSpan={6} className="py-8 text-center text-muted">No subscriptions.</TD></TR>}
          </TBody>
        </Table>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Billing events</h2>
        <Table>
          <THead><TR><TH>When</TH><TH>User</TH><TH>Type</TH><TH>Description</TH><TH className="text-right">Amount</TH></TR></THead>
          <TBody>{billing.slice(0, 50).map((b) => <TR key={b.id}><TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(b.createdAt)}</TD><TD className="text-xs">{byId.get(b.userId)?.email ?? b.userId}</TD><TD className="text-xs font-mono">{b.type}</TD><TD>{b.description}</TD><TD className="tabular text-right">{formatMoney(b.amountCents / 100)}</TD></TR>)}</TBody>
        </Table>
      </section>
    </>
  );
}
