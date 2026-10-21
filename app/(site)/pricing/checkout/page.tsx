import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { billingStatus } from "@/lib/billing";
import { startCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; pending?: string }> }) {
  const { plan: planKey, pending } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pricing/checkout?plan=${planKey ?? ""}`)}`);
  const plan = (await getRepo().listPlans()).find((p) => p.key === planKey && p.active);
  if (!plan) redirect("/pricing?error=plan");
  const demo = isDemoMode();
  const status = billingStatus();
  const per = plan.interval === "day" ? "24-hour pass (no renewal)" : plan.interval === "week" ? "renews every 7 days" : "renews monthly";

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="card rounded-3xl p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Checkout</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{plan.name}</h1>
        <p className="text-sm text-muted">{plan.tagline}</p>
        <div className="mt-5 flex items-baseline justify-between rounded-xl border border-border bg-bg-2 px-4 py-3">
          <span className="text-sm text-muted">{per}</span>
          <span className="tabular font-display text-2xl font-extrabold">{formatMoney(plan.priceCents / 100)}</span>
        </div>
        <p className="mt-3 text-xs text-muted-2">Signed in as {user.email}. By continuing you agree to the <Link href="/legal/terms" className="underline">Terms</Link>, including that picks are informational only and that {plan.interval === "day" ? "this pass does not renew" : "this plan renews automatically until canceled"}.</p>

        {demo ? (
          <form action={startCheckout} className="mt-6 space-y-3">
            <input type="hidden" name="plan" value={plan.key} />
            <Badge variant="demo">Demo mode — no payment is taken</Badge>
            <Button type="submit" size="lg" className="w-full">Activate {plan.name} (demo)</Button>
            <p className="text-xs text-muted-2">This activates the subscription entitlement in the in-memory demo store so you can explore the member experience.</p>
          </form>
        ) : !status.approved || pending ? (
          <div className="mt-6 rounded-xl border border-pending/40 bg-pending/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-bold text-pending"><AlertTriangle className="h-4 w-4" /> Billing not yet live</div>
            <p className="mt-2 text-muted">Paid sports-picks services are a restricted merchant category. Live billing stays disabled until our payment provider has explicitly approved this business — no charge has been made. Check back soon, or <Link href="/results" className="text-brand underline">review the record</Link> in the meantime.</p>
          </div>
        ) : (
          <form action={startCheckout} className="mt-6 space-y-3">
            <input type="hidden" name="plan" value={plan.key} />
            <Button type="submit" size="lg" className="w-full"><ShieldCheck className="h-4 w-4" /> Continue to secure payment</Button>
            <p className="text-xs text-muted-2">You&rsquo;ll be redirected to our payment provider ({status.provider}). We never see or store your card details.</p>
          </form>
        )}
      </div>
    </div>
  );
}
