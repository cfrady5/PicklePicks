export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Publishable key (sb_publishable_…) or legacy anon key — safe for the browser.
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Secret key (sb_secret_…) or legacy service_role key — server only, bypasses RLS.
  supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  billingApproved: process.env.BILLING_PROVIDER_APPROVED === "true",
  billingProvider: process.env.BILLING_PROVIDER ?? "stripe",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePrices: {
    daily: process.env.STRIPE_PRICE_DAILY ?? "",
    weekly: process.env.STRIPE_PRICE_WEEKLY ?? "",
    vip: process.env.STRIPE_PRICE_VIP ?? "",
  } as Record<string, string>,
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Mr. Pickle's Picks <picks@example.com>",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isDemoMode = () => !isSupabaseConfigured();
