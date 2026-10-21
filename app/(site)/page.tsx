import { getRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { computeStats, cumulativeSeries, isSettled } from "@/lib/stats";
import { Hero } from "@/components/home/hero";
import { StatsRow } from "@/components/home/stats-row";
import { PickleJarCarousel } from "@/components/home/pickle-jar-carousel";
import { HowItWorks } from "@/components/home/how-it-works";
import { PricingCards } from "@/components/home/pricing-cards";
import { FinalCta } from "@/components/home/final-cta";
import { Section } from "@/components/layout/section";
import { BRAND_COPY } from "@/lib/constants";
import { Reveal } from "@/components/motion/reveal";
import { DEMO_NOW } from "@/lib/data/demo-seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = getRepo();
  const demo = isDemoMode();
  const [content, picks, plans] = await Promise.all([repo.getSiteContent(), repo.listPublicPicks(), repo.listPlans()]);
  const settled = picks.filter(isSettled);
  const stats = computeStats(picks);
  const series = cumulativeSeries(settled, "weekly").map((p) => p.cumulative);
  const wins = settled.filter((p) => p.result === "win").sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? "")).slice(0, 18);
  const recent = [...settled].sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? "")).slice(0, 24);

  // Hero tickets: use real recent wins if we have them; otherwise illustrate.
  const heroTickets = wins.length >= 3 ? wins.slice(0, 3) : [];
  const illustrative = demo || wins.length < 3;
  void DEMO_NOW;

  return (
    <>
      <Hero content={content} series={series.length >= 2 ? series : [0, 0.6, 0.4, 1.1, 0.9, 1.6, 2.2, 1.9, 2.8]} tickets={heroTickets} illustrative={illustrative} />
      {content.announcement && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-center text-sm font-semibold text-brand">{content.announcement}</div></div>
      )}
      <StatsRow stats={stats} demo={demo} />

      <Section id="jar" eyebrow="Settled on the record" title={BRAND_COPY.jarOfWins} subtitle="Every winning ticket has a story. Here's how our recorded picks performed.">
        <PickleJarCarousel wins={wins} all={recent} demo={demo} />
      </Section>

      <Section eyebrow="How it works" title="Transparent by design." subtitle="A sports picks service you can audit. Here's the whole loop, start to finish.">
        <HowItWorks />
      </Section>

      <Section eyebrow="Pricing" title="Pick your jar." subtitle="Simple plans, clear renewal terms, cancel anytime. Prices shown are current placeholders and can change." align="center">
        <PricingCards plans={plans} />
        <Reveal className="mt-6 text-center text-xs text-muted-2">No profitability is promised or implied. Subscriptions buy access to picks and analysis, not outcomes.</Reveal>
      </Section>

      <FinalCta />
    </>
  );
}
