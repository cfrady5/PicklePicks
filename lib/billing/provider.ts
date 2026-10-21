import type { SubscriptionPlan } from "@/lib/data/types";

/**
 * Billing provider abstraction.
 *
 * IMPORTANT: Paid sports-picks ("handicapping") services are a restricted
 * business category at most payment processors, including Stripe by default.
 * Live billing is therefore gated behind BILLING_PROVIDER_APPROVED=true, which
 * must only be set after the provider has explicitly approved this business in
 * writing. Until then, checkout returns a "pending approval" state and no
 * money moves.
 */
export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: { userId: string; email: string; plan: SubscriptionPlan; successUrl: string; cancelUrl: string }): Promise<{ url: string }>;
  createPortalSession(input: { userId: string; returnUrl: string }): Promise<{ url: string }>;
  handleWebhook(rawBody: string, signature: string): Promise<{ handled: boolean; type?: string }>;
}

export class BillingNotApprovedError extends Error {
  constructor() {
    super("Live billing is disabled until the payment provider has approved the paid sports-picks business category.");
    this.name = "BillingNotApprovedError";
  }
}
