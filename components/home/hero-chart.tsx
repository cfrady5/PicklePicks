"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Animated rising performance line drawn behind the mascot. */
export function HeroChart({ points, className }: { points: number[]; className?: string }) {
  const reduce = useReducedMotion();
  const W = 600, H = 360, PAD = 20;
  const data = points.length >= 2 ? points : [0, 1];
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const coords = data.map((v, i) => [PAD + (i / (data.length - 1)) * (W - PAD * 2), H - PAD - ((v - min) / span) * (H - PAD * 2)] as const);
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${coords[coords.length - 1][0].toFixed(1)},${H} L${coords[0][0].toFixed(1)},${H} Z`;
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8dff32" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8dff32" stopOpacity="0" />
        </linearGradient>
        <filter id="heroGlow"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#8dff32" strokeOpacity="0.08" strokeDasharray="4 8" />)}
      <motion.path d={area} fill="url(#heroArea)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} />
      <motion.path d={d} fill="none" stroke="#8dff32" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#heroGlow)" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, ease: "easeInOut", delay: 0.3 }} />
      <motion.g initial={reduce ? false : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.1, type: "spring", stiffness: 300, damping: 14 }} style={{ transformOrigin: `${last[0]}px ${last[1]}px` }}>
        <circle cx={last[0]} cy={last[1]} r="14" fill="#8dff32" opacity="0.25" className="animate-pulse-glow" />
        <circle cx={last[0]} cy={last[1]} r="6" fill="#8dff32" />
      </motion.g>
    </svg>
  );
}
