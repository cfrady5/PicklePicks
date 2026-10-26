# Mr. Pickle's Picks

Premium sports-picks subscription platform: public performance ledger, member dashboard with premium picks and a personal bet tracker, and an admin control center for publishing and settling picks with an immutable audit trail.

Built with Next.js (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Supabase (Postgres, Auth, RLS, Realtime, Storage) · Stripe-ready billing adapter · Resend email · Vercel.

## Quick start (demo mode)

```bash
npm install
npm run dev
```

With no Supabase environment variables set, the app runs in **demo mode**: an in-memory store seeded with clearly-labeled sample picks (every record carries `isDemo: true` and a visible "Demo data" badge), three sample personas on the login page (VIP member, free account, administrator), and a no-charge "demo activation" in place of checkout. Nothing in demo mode is a real track record.

## Production setup (Supabase)

1. **Create the schema.** In the Supabase dashboard open SQL editor → New query, paste `supabase/setup.sql`, and run it once. (It is generated from `supabase/migrations/` by `npm run db:bundle`.) It creates every table with explicit least-privilege grants and RLS, the `private` helper schema, the publish/settle/correct RPCs, the immutability trigger, realtime publication, and the `promo` and `hype` storage buckets.
2. **Auth URLs.** Authentication → URL Configuration: set Site URL to your production URL and add `<site>/auth/callback` to Redirect URLs.
3. **Environment variables** (Vercel → Project → Settings → Environment Variables, Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_…` key (or the legacy anon key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SECRET_KEY` = the `sb_secret_…` key (or legacy `SUPABASE_SERVICE_ROLE_KEY`). Server only; never prefix with `NEXT_PUBLIC_`.
   - `NEXT_PUBLIC_SITE_URL` = your production URL
   - `ADMIN_EMAILS` = your email; that account becomes admin on first sign-in.
4. **Redeploy**, sign up with the admin email, confirm it, and sign in. The site leaves demo mode as soon as `NEXT_PUBLIC_SUPABASE_URL` is set; the picks ledger starts empty, with no demo records.

The schema is verified by an RLS test suite (roles anon / authenticated / service_role) covering the paywall, immutability, settlement, privilege escalation and RPC lockdown.

## Billing

Paid sports-picks ("handicapping") services are a restricted merchant category at most processors, including Stripe by default. Live billing is gated behind `BILLING_PROVIDER_APPROVED=true` and must only be enabled after the provider has approved this business category in writing. Until then, checkout shows a "billing not yet live" notice and no charge is made. The Stripe adapter (`lib/billing/stripe.ts`) handles Checkout, Billing Portal, and the webhook at `/api/billing/webhook` (`checkout.session.completed`, `invoice.paid`, `customer.subscription.*`). Add additional providers by implementing `BillingProvider` in `lib/billing/provider.ts`.

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` to enable transactional emails (new picks, settled results, renewal reminders, welcome). Without a key, emails are logged and skipped; in-app notifications always work.

## Architecture

- `lib/data/repo.ts` — the data interface. `demo-repo.ts` (in-memory) and `supabase-repo.ts` implement it; `getRepo()` picks one based on env.
- `lib/stats.ts` — all performance math (win rate, net units, ROI, streaks, drawdown, cumulative series, per-sport/per-bet-type). Everything shown publicly is computed from settled records; nothing is hand-entered.
- `lib/odds.ts` — American odds → profit multipliers and settlement.
- `lib/auth.ts` — `getCurrentUser`, `getEntitlement` (server-side subscription check), `requireUser`, `requireAdmin`.
- `proxy.ts` — session refresh and route protection for `/dashboard` and `/admin`.
- `app/actions/*` — server actions for auth, billing, member features, admin publishing/settlement.

### Integrity rules

- Publishing freezes the betting fields and stores a snapshot in `pick_publications` with a timestamp. A DB trigger rejects edits to published picks.
- Settlement writes `pick_settlements`, computes net units automatically, logs to `pick_audit_log` with the admin's identity, settles mirrored tracker bets, and notifies subscribers — in one transaction (`settle_pick` RPC).
- Corrections require a reason; the previous settlement stays visible, marked superseded.
- The personal tracker uses the member's own odds and stakes and is never mixed with the service's unit-based record.
- Homepage statistics show "Not yet available" until at least 10 picks are settled.

## Meme video agent (Higgsfield + Twilio)

Give it a published pick and it autonomously produces a 9:16 hype video, a branded 1080×1920 cover, and a text message with both. Admin → **Meme video agent**, or press **Generate hype video** on any published pick, or `POST /api/hype/jobs {"pickId"}` with `Authorization: Bearer $HYPE_API_KEY`.

Pipeline (each step is persisted; every paid call is reserved against the per-pick cap first):

1. **resolve_subject** — picks the team's official mascot (or its star for player props) from a curated 140+ team library in `lib/hype/teams.ts`; optional Claude fallback for unknown teams. Real-athlete likeness is off unless `HYPE_ALLOW_LIKENESS=true`.
2. **select_format** — trend layer is a rights-safe *format* library (`lib/hype/formats.ts`), matched against Higgsfield's licensed motion presets or your own rights-cleared reference clips. Nothing is scraped from social platforms.
3. **generate_image** — Higgsfield Soul text-to-image, 9:16.
4. **generate_video** — Higgsfield DoP image-to-video with a motion preset (default), or Genjutsu Light motion transfer from a reference clip (`HYPE_VIDEO_PROVIDER=genjutsu_light`; confirm the endpoint path in the Higgsfield console first). Max one render plus one retry, only if budget remains.
5. **compose_cover** — deterministic cover via satori + sharp (text is never AI-generated).
6. **store_assets** — copies outputs into the `hype` storage bucket.
7. **notify** — Twilio MMS with the cover and a link to the MP4.

Budget: `HYPE_MAX_SPEND_USD` (default 2.00). Price assumptions are env-configurable estimates (`HYPE_PRICE_*`) and should be reconciled against provider invoices; a job that cannot reserve its next step stops as `budget_blocked`. Without `HF_API_KEY`/`HF_API_SECRET` the agent runs in **simulated** mode (no render, nothing billed) so the flow can be exercised end to end.

Workers: the submit handler advances the job in the background; the job page keeps it moving while open; `/api/cron/hype` (Vercel Cron, daily on Hobby) and the optional Higgsfield webhook (`HYPE_WEBHOOK_SECRET`) cover the rest. For minute-level cadence use Supabase `pg_cron` to call the worker (see `supabase/migrations/0002_hype_agent.sql`).

## Deployment

The GitHub repository is linked to the Vercel project `picksbpickle` on the `cfrady` team, so every push creates a preview deployment and pushes to the production branch go live. Set the production branch and environment variables in the Vercel project settings.

## Compliance

Terms, Privacy and Responsible Gambling pages are templates and require jurisdiction-specific legal review before launch, as does the advertising of a paid picks service. The platform does not accept wagers or place bets.
