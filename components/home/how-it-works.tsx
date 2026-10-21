import Link from "next/link";
import { Search, Megaphone, Gavel, LineChart } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const STEPS = [
  { icon: Search, title: "We do the homework", body: "Market pricing, matchup data, injuries, rest, weather and line movement. Every pick has a written reason, not a vibe." },
  { icon: Megaphone, title: "Picks are timestamped", body: "Each pick is published with its odds, stake in units and analysis — and the publication time is recorded. Nothing changes after tip-off." },
  { icon: Gavel, title: "Results are settled on the record", body: "When the game ends, an admin settles the pick, net units are calculated automatically, and the settlement is logged with who did it and when." },
  { icon: LineChart, title: "You see everything", body: "Wins, losses, pushes, drawdowns and losing streaks are all on the public ledger. Track your own bets separately in the member dashboard." },
];

export function HowItWorks({ cta = true }: { cta?: boolean }) {
  return (
    <>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <StaggerItem key={s.title}>
            <div className="card group h-full rounded-2xl p-6 transition hover:border-brand/40">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand transition group-hover:shadow-[0_0_20px_-4px_var(--brand)]"><s.icon className="h-5 w-5" /></div>
                <span className="font-display text-3xl font-extrabold text-border-strong">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      {cta && (
        <div className="mt-8 text-center">
          <Button variant="outline" asChild><Link href="/how-it-works">Read the full methodology</Link></Button>
        </div>
      )}
    </>
  );
}
