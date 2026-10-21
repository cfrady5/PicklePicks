import type { Metadata } from "next";
import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getEntitlement } from "@/lib/auth";
import { PageHeader, Section } from "@/components/layout/section";
import { PricingCards } from "@/components/home/pricing-cards";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "Pricing", description: "Daily, weekly and monthly access to Mr. Pickle's premium picks. Clear renewal terms, cancel anytime." };
export const dynamic = "force-dynamic";

const TERMS = [
  ["What you're buying", "Access to published picks and written analysis for the plan's duration, plus the member dashboard, personal tracker and analytics. You are not buying outcomes, and no profit is promised."],
  ["Renewals", "Weekly and VIP plans renew automatically at the listed price until canceled. The Daily Pickle is a one-time 24-hour pass and does not renew."],
  ["Cancellation", "Cancel anytime from Dashboard → Subscription. Access continues until the end of the paid period. No partial refunds for unused time unless required by law."],
  ["Billing history", "Every charge appears in your billing history with date, amount and plan."],
  ["Eligibility", "You must meet the legal age for sports-betting information in your jurisdiction (21+ in most U.S. states), and the service may be unavailable where restricted."],
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, plans, ent] = await Promise.all([searchParams, getRepo().listPlans(), getEntitlement()]);
  return (
    <>
      <PageHeader eyebrow="Pricing" title="Pick your jar." subtitle="Three ways in. No fake countdowns, no 'lock-of-the-century' upsells — just access to the picks and the record behind them." />
      <Section className="py-12">
        {error === "plan" && <p role="alert" className="mb-6 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">That plan isn&rsquo;t available right now.</p>}
        <PricingCards plans={plans} currentPlanKey={ent.planKey} />
        <Reveal className="mt-6 text-center text-xs text-muted-2">Prices are shown in USD and are current placeholders subject to change before launch. Taxes may apply.</Reveal>
      </Section>
      <Section eyebrow="The fine print, up front" title="Clear terms." className="pt-0">
        <div className="grid gap-4 md:grid-cols-2">
          {TERMS.map(([t, b]) => (
            <div key={t} className="card rounded-2xl p-6"><h3 className="font-display font-bold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{b}</p></div>
          ))}
          <div className="card rounded-2xl border-brand/30 p-6">
            <h3 className="font-display font-bold">Responsible gambling</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Our record includes losing streaks and drawdowns. Never bet more than you can afford to lose. <Link href="/responsible-gambling" className="text-brand underline">Resources and self-exclusion links</Link>.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
