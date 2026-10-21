import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/layout/section";
import { HowItWorks } from "@/components/home/how-it-works";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "How It Works", description: "How Mr. Pickle's Picks publishes, settles and reports picks — including unit sizing, confidence tiers and immutability rules." };

const FAQ = [
  { q: "What is a unit?", a: "A unit is a stake-size abstraction. If your standard bet is $25, then 1u = $25 and a 2u play = $50. All service results are reported in units so they translate to any bankroll. Your personal tracker lets you record actual dollar stakes separately." },
  { q: "How are net units calculated?", a: "American odds. A 1u win at -110 returns +0.91u; a 1u win at +150 returns +1.50u; a loss returns -1u regardless of odds; a push returns 0u. ROI = net units ÷ units staked on graded (win/loss) picks." },
  { q: "What do confidence tiers mean?", a: "Lean / Play / Strong reflect how much of our standard unit we recommend staking based on our internal process. They are not calibrated win probabilities, and no tier guarantees anything. We publish them so you can see how our higher-conviction picks have actually performed over time." },
  { q: "Can a pick be edited after it's published?", a: "No. The selection, odds, stake, start time and analysis are frozen the moment a pick is published, and a timestamped snapshot is stored. If a settlement needs correcting (for example, a scoring change), the correction is recorded with a reason and the previous settlement stays visible in the audit trail." },
  { q: "Which odds are used for the record?", a: "The odds at the listed sportsbook at publication time. The odds you get may differ depending on timing and your book. Your personal tracker records what you actually received." },
  { q: "Do you take bets?", a: "No. We are an information service. We do not accept wagers or deposits, do not place bets for anyone, and are not affiliated with any sportsbook." },
  { q: "Is winning guaranteed?", a: "No. Nobody can guarantee sports betting outcomes, and anyone who says otherwise is selling something. Our record includes losing weeks and drawdowns because that is what real betting looks like. Only bet what you can afford to lose." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="Methodology" title="How the jar works." subtitle="The full loop — from research to a settled, auditable record. Transparency is the product." />
      <Section className="py-12"><HowItWorks cta={false} /></Section>
      <Section eyebrow="FAQ" title="Straight answers." className="pt-0">
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className="card h-full rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild><Link href="/results">See the record</Link></Button>
          <Button variant="secondary" asChild><Link href="/responsible-gambling">Responsible gambling resources</Link></Button>
        </div>
      </Section>
    </>
  );
}
