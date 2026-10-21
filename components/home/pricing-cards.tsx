import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn, formatMoney } from "@/lib/utils";

export function PricingCards({ plans, currentPlanKey, checkoutHref = (k: string) => `/pricing/checkout?plan=${k}` }: { plans: SubscriptionPlan[]; currentPlanKey?: string | null; checkoutHref?: (key: string) => string }) {
  return (
    <Stagger className="grid gap-5 lg:grid-cols-3">
      {plans.filter((p) => p.active).map((p) => {
        const per = p.interval === "day" ? "/ 24 hours" : p.interval === "week" ? "/ 7 days" : "/ month";
        const current = currentPlanKey === p.key;
        return (
          <StaggerItem key={p.key}>
            <div className={cn("relative flex h-full flex-col rounded-3xl border p-7 transition", p.highlight ? "border-brand/60 bg-gradient-to-b from-[#1b3322] to-card glow-ring lg:-translate-y-3" : "card")}>
              {p.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-brand/60 bg-bg px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand"><Sparkles className="mr-1 inline h-3 w-3" /> Most complete</div>
              )}
              <h3 className="font-display text-xl font-extrabold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="tabular font-display text-5xl font-extrabold">{formatMoney(p.priceCents / 100)}</span>
                <span className="text-sm text-muted">{per}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{f}</span></li>
                ))}
              </ul>
              <Button className="mt-7 w-full" variant={p.highlight ? "primary" : "secondary"} size="lg" asChild disabled={current}>
                <Link href={current ? "/dashboard/subscription" : checkoutHref(p.key)}>{current ? "Current plan" : `Choose ${p.name}`}</Link>
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-2">{p.interval === "day" ? "One-time, no auto-renew." : "Renews automatically. Cancel anytime."}</p>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
