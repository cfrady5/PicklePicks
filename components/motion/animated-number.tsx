"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export type NumberFormat = "int" | "pct" | "signedPct" | "units" | "money" | "signedMoney" | "decimal";

export function formatNumber(n: number, format: NumberFormat): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  switch (format) {
    case "int": return Math.round(n).toLocaleString();
    case "pct": return `${n.toFixed(1)}%`;
    case "signedPct": return `${sign}${abs.toFixed(1)}%`;
    case "units": return `${sign}${abs.toFixed(2)}u`;
    case "money": return abs.toLocaleString("en-US", { style: "currency", currency: "USD" });
    case "signedMoney": return `${sign}${abs.toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
    default: return n.toFixed(2);
  }
}

export function AnimatedNumber({ value, format = "int", duration = 1.4, className }: { value: number; format?: NumberFormat; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  const shown = reduce ? value : inView ? display : 0;
  return <span ref={ref} className={className}>{formatNumber(shown, format)}</span>;
}
