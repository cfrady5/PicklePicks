"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { env, isDemoMode } from "@/lib/env";
import { activateDemoSubscription, billingStatus, getBillingProvider } from "@/lib/billing";

export async function startCheckout(formData: FormData) {
  const planKey = String(formData.get("plan") ?? "");
  const user = await requireUser(`/pricing/checkout?plan=${planKey}`);
  const plan = (await getRepo().listPlans()).find((p) => p.key === planKey && p.active);
  if (!plan) redirect("/pricing?error=plan");

  if (isDemoMode()) {
    await activateDemoSubscription(user.id, plan);
    redirect("/dashboard?welcome=1");
  }
  const status = billingStatus();
  if (!status.approved) redirect(`/pricing/checkout?plan=${planKey}&pending=1`);
  const provider = getBillingProvider();
  const { url } = await provider.createCheckoutSession({
    userId: user.id,
    email: user.email,
    plan,
    successUrl: `${env.siteUrl}/dashboard?welcome=1`,
    cancelUrl: `${env.siteUrl}/pricing`,
  });
  redirect(url);
}

export async function openBillingPortal() {
  const user = await requireUser("/dashboard/subscription");
  if (isDemoMode() || !billingStatus().approved) redirect("/dashboard/subscription?portal=unavailable");
  const { url } = await getBillingProvider().createPortalSession({ userId: user.id, returnUrl: `${env.siteUrl}/dashboard/subscription` });
  redirect(url);
}

export async function cancelSubscription(formData: FormData) {
  const user = await requireUser("/dashboard/subscription");
  const immediate = formData.get("mode") === "now";
  await getRepo().cancelSubscription(user.id, !immediate);
  redirect("/dashboard/subscription?canceled=1");
}
