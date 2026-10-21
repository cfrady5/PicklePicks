"use client";
import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Clock, BookOpen, ExternalLink } from "lucide-react";
import type { Pick } from "@/lib/data/types";
import { BET_TYPES } from "@/lib/constants";
import { cn, formatDateTime, formatOdds, formatUnits } from "@/lib/utils";
import { SportBadge } from "./sport-badge";
import { ResultBadge, DemoTag, ConfidenceBadge } from "./status-badge";

export function PickCard({ pick, defaultOpen = false, action }: { pick: Pick; defaultOpen?: boolean; action?: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const reduce = useReducedMotion();
  const betType = BET_TYPES.find((b) => b.key === pick.betType)?.label ?? pick.betType;
  const settled = pick.status === "settled";
  return (
    <motion.article
      layout
      whileHover={reduce ? undefined : { y: -2 }}
      className={cn(
        "card overflow-hidden rounded-2xl transition-shadow hover:shadow-[0_0_0_1px_rgba(141,255,50,0.25),0_20px_50px_-30px_rgba(141,255,50,0.4)]",
        settled && pick.result === "win" && "border-win/30",
        settled && pick.result === "loss" && "border-loss/25",
      )}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-4 p-5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SportBadge sport={pick.sport} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{betType}</span>
            <ConfidenceBadge tier={pick.confidence} />
            <DemoTag show={pick.isDemo} />
          </div>
          <div className="mt-2 text-sm text-muted">{pick.matchup}</div>
          <h3 className="mt-0.5 font-display text-xl font-extrabold leading-tight">{pick.selection}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDateTime(pick.startTime)}</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {pick.sportsbook}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ResultBadge result={pick.result} status={pick.status} />
          <div className="tabular text-right">
            <div className="font-display text-2xl font-extrabold text-text">{formatOdds(pick.odds)}</div>
            <div className="text-xs text-muted">{pick.stake.toFixed(1)}u stake</div>
          </div>
          {settled && <div className={cn("tabular text-sm font-bold", pick.netUnits > 0 ? "text-win" : pick.netUnits < 0 ? "text-loss" : "text-push")}>{formatUnits(pick.netUnits)}u</div>}
          <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="border-t border-border px-5 pb-5 pt-4">
              <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">The read</h4>
                  <p className="mt-2 text-sm leading-relaxed text-text/90">{pick.analysis}</p>
                  <h4 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">Confidence: {pick.confidence}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{pick.confidenceNote}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Key indicators</h4>
                  <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {pick.keyStats.map((s) => (
                      <div key={s.label} className="flex items-center justify-between px-3 py-2 text-sm"><dt className="text-muted">{s.label}</dt><dd className="tabular font-semibold">{s.value}</dd></div>
                    ))}
                    {pick.keyStats.length === 0 && <div className="px-3 py-2 text-sm text-muted-2">No indicators recorded.</div>}
                  </dl>
                  <div className="mt-4 text-[11px] text-muted-2">
                    Published {pick.publishedAt ? formatDateTime(pick.publishedAt) : "—"}
                    {pick.settledAt && <> · Settled {formatDateTime(pick.settledAt)}{pick.finalScore ? ` · Final ${pick.finalScore}` : ""}</>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Link href={`/picks/${pick.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Verified record &amp; audit trail</Link>
                {action}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
