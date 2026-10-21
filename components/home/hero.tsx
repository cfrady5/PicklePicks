"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/logo";
import { PickleIcon } from "@/components/brand/pickle-icon";
import type { Pick, SiteContent } from "@/lib/data/types";
import { HeroChart } from "./hero-chart";
import { FloatingTickets } from "./floating-tickets";

export function Hero({ content, series, tickets, illustrative }: { content: SiteContent; series: number[]; tickets: Pick[]; illustrative: boolean }) {
  const reduce = useReducedMotion();
  const fade = (delay: number) => ({ initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } });
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
      <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <PickleIcon className="h-3.5 w-3.5" /> {content.heroEyebrow}
          </motion.div>
          <motion.h1 {...fade(0.1)} className="mt-5 font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[4.4rem]">
            {content.heroHeadline.split(". ").map((part, i, arr) => (
              <span key={i} className={i === arr.length - 1 ? "text-gradient" : "block"}>
                {part}{i < arr.length - 1 ? "." : ""}{" "}
              </span>
            ))}
          </motion.h1>
          <motion.p {...fade(0.2)} className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{content.heroSubheadline}</motion.p>
          <motion.div {...fade(0.3)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link href="/pricing">{content.primaryCta} <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link href="/results"><BarChart3 className="h-4 w-4" /> {content.secondaryCta}</Link></Button>
          </motion.div>
          <motion.p {...fade(0.4)} className="mt-5 text-xs text-muted-2">Every pick is timestamped at publication and settled on a public ledger. No cherry-picking, no deleted losses.</motion.p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[560px]">
          <div aria-hidden className="absolute inset-[10%] rounded-full bg-brand/25 blur-[80px] animate-pulse-glow" />
          <HeroChart points={series} className="absolute inset-x-[-6%] bottom-[2%] h-[72%] w-[112%]" />
          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.25 }} className="absolute inset-[8%] flex items-center justify-center">
            <Mascot priority size={520} className="h-full w-full object-contain" />
          </motion.div>
          <FloatingTickets picks={tickets} illustrative={illustrative} />
        </div>
      </div>
    </section>
  );
}
