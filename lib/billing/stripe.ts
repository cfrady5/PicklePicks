import Stripe from "stripe";
import { env } from "@/lib/env";
import { getRepo } from "@/lib/data";
import type { BillingProvider } from "./provider";
import type { SubscriptionStatus } from "@/lib/data/types";

let stripe: Stripe | null = null;
function client() {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!stripe) stripe = new Stripe(env.stripeSecretKey);
  return stripe;
}

function periodEndFor(planKey: string, from = new Date()) {
  const d = new Date(from);
  if (planKey === "daily") d.setDate(d.getDate() + 1);
  else if (planKey === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export const stripeProvider: BillingProvider = {
  name: "stripe",
  async createCheckoutSession({ userId, email, plan, successUrl, cancelUrl }) {
    const price = env.stripePrices[plan.key];
    if (!price) throw new Error(`No Stripe price configured for plan "${plan.key}"`);
    const session = await client().checkout.sessions.create({
      mode: plan.interval === "day" ? "payment" : "subscription",
      customer_email: email,
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planKey: plan.key },
      allow_promotion_codes: false,
    });
    return { url: session.url! };
  },
  async createPortalSession({ userId, returnUrl }) {
    const sub = await getRepo().getActiveSubscription(userId);
    if (!sub?.providerSubscriptionId) throw new Error("No provider subscription on file");
    const s = await client().subscriptions.retrieve(sub.providerSubscriptionId);
    const session = await client().billingPortal.sessions.create({ customer: s.customer as string, return_url: returnUrl });
    return { url: session.url };
  },
  async handleWebhook(rawBody, signature) {
    const event = client().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
    const repo = getRepo();
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.metadata?.userId;
        const planKey = s.metadata?.planKey;
        if (!userId || !planKey) break;
        const now = new Date();
        await repo.upsertSubscription({
          userId,
          planKey,
          status: "active",
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEndFor(planKey, now),
          cancelAtPeriodEnd: false,
          provider: "stripe",
          providerSubscriptionId: typeof s.subscription === "string" ? s.subscription : s.id,
        });
        await repo.addBillingEvent({ userId, type: event.type, amountCents: s.amount_total ?? 0, currency: s.currency ?? "usd", description: `Checkout: ${planKey}` });
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object;
        const subId = typeof inv.parent?.subscription_details?.subscription === "string" ? inv.parent.subscription_details.subscription : null;
        if (!subId) break;
        const s = await client().subscriptions.retrieve(subId);
        const userId = s.metadata?.userId;
        const planKey = s.metadata?.planKey ?? "vip";
        const item = s.items.data[0];
        if (userId && item) {
          await repo.upsertSubscription({
            userId,
            planKey,
            status: "active",
            currentPeriodStart: new Date(item.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(item.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: s.cancel_at_period_end,
            provider: "stripe",
            providerSubscriptionId: s.id,
          });
          await repo.addBillingEvent({ userId, type: event.type, amountCents: inv.amount_paid, currency: inv.currency, description: "Subscription renewal" });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const s = event.data.object;
        const userId = s.metadata?.userId;
        const item = s.items.data[0];
        if (userId && item) {
          await repo.upsertSubscription({
            userId,
            planKey: s.metadata?.planKey ?? "vip",
            status: (s.status === "active" || s.status === "trialing" ? s.status : s.status === "past_due" ? "past_due" : "canceled") as SubscriptionStatus,
            currentPeriodStart: new Date(item.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(item.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: s.cancel_at_period_end,
            provider: "stripe",
            providerSubscriptionId: s.id,
          });
        }
        break;
      }
    }
    return { handled: true, type: event.type };
  },
};
