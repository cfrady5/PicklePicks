import { env, isDemoMode } from "@/lib/env";
import { getRepo } from "@/lib/data";
import type { SubscriptionPlan } from "@/lib/data/types";
import { BillingNotApprovedError, type BillingProvider } from "./provider";
import { stripeProvider } from "./stripe";

export { BillingNotApprovedError };

export function billingStatus() {
  return {
    approved: env.billingApproved,
    provider: env.billingProvider,
    configured: env.billingProvider === "stripe" ? Boolean(env.stripeSecretKey) : false,
    demo: isDemoMode(),
  };
}

export function getBillingProvider(): BillingProvider {
  if (!env.billingApproved) throw new BillingNotApprovedError();
  if (env.billingProvider === "stripe") return stripeProvider;
  throw new Error(`Unknown billing provider: ${env.billingProvider}`);
}

function periodEndFor(plan: SubscriptionPlan, from = new Date()) {
  const d = new Date(from);
  if (plan.interval === "day") d.setDate(d.getDate() + plan.intervalCount);
  else if (plan.interval === "week") d.setDate(d.getDate() + 7 * plan.intervalCount);
  else d.setMonth(d.getMonth() + plan.intervalCount);
  return d.toISOString();
}

/**
 * Demo-mode "purchase": activates a subscription without any payment so the
 * entitlement flow can be exercised end-to-end. Never available when a real
 * provider is enabled.
 */
export async function activateDemoSubscription(userId: string, plan: SubscriptionPlan) {
  if (!isDemoMode()) throw new Error("Demo activation is only available in demo mode");
  const repo = getRepo();
  const now = new Date();
  const sub = await repo.upsertSubscription({
    userId,
    planKey: plan.key,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEndFor(plan, now),
    cancelAtPeriodEnd: false,
    provider: "demo",
  });
  await repo.addBillingEvent({ userId, type: "demo.activated", amountCents: plan.priceCents, currency: "usd", description: `${plan.name} (demo — no charge)` });
  return sub;
}
