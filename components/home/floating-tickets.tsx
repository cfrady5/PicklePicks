"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { Pick } from "@/lib/data/types";
import { formatOdds, formatUnits, cn } from "@/lib/utils";
import { sportMeta } from "@/components/picks/sport-badge";

export function FloatingTickets({ picks, illustrative }: { picks: Pick[]; illustrative: boolean }) {
  const reduce = useReducedMotion();
  const positions = [
    { cls: "left-[-4%] top-[14%]", tilt: -6, delay: 0.9 },
    { cls: "right-[-6%] top-[26%]", tilt: 5, delay: 1.1 },
    { cls: "left-[2%] bottom-[10%]", tilt: 4, delay: 1.3 },
  ];
  return (
    <>
      {picks.slice(0, 3).map((p, i) => {
        const pos = positions[i];
        const m = sportMeta(p.sport);
        return (
          <motion.div
            key={p.id}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: pos.delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ "--tilt": `${pos.tilt}deg` } as React.CSSProperties}
            className={cn("absolute z-20 hidden w-[196px] animate-float rounded-xl border border-brand/30 bg-card/90 p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9),0_0_30px_-10px_rgba(141,255,50,0.5)] backdrop-blur-md sm:block", pos.cls)}
            aria-hidden
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
              <span>{m.emoji} {p.sport}</span>
              <span className={p.result === "win" ? "text-win" : "text-pending"}>{p.result === "win" ? "WIN" : "PENDING"}</span>
            </div>
            <div className="mt-1.5 truncate font-display text-[13px] font-bold">{p.selection}</div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="tabular text-muted">{formatOdds(p.odds)} · {p.stake.toFixed(1)}u</span>
              <span className={cn("tabular font-bold", p.result === "win" ? "text-win" : "text-muted")}>{p.result === "win" ? `${formatUnits(p.netUnits)}u` : "—"}</span>
            </div>
            {illustrative && <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-pending">Illustrative sample</div>}
          </motion.div>
        );
      })}
    </>
  );
}
