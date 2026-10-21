import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-br from-[#16301f] via-card to-bg-2 px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:py-16">
          <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative max-w-xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Fresh Picks daily</div>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Welcome to the Pickle Jar.</h2>
            <p className="mt-3 text-muted sm:text-lg">Read the record. Judge the losses as hard as the wins. Then decide if you want in.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild><Link href="/pricing">Get Today&rsquo;s Picks <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button size="lg" variant="secondary" asChild><Link href="/results">The Pickle&rsquo;s Record</Link></Button>
            </div>
          </div>
          <div className="relative mt-8 hidden lg:mt-0 lg:block"><Mascot size={220} className="h-[220px] w-[220px]" /></div>
        </div>
      </Reveal>
    </section>
  );
}
