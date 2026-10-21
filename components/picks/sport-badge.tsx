import { SPORTS, type SportKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function sportMeta(key: SportKey) {
  return SPORTS.find((s) => s.key === key) ?? SPORTS[SPORTS.length - 1];
}

export function SportBadge({ sport, className, showLabel = true }: { sport: SportKey; className?: string; showLabel?: boolean }) {
  const m = sportMeta(sport);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-text/90", className)}>
      <span aria-hidden className="text-sm leading-none">{m.emoji}</span>
      {showLabel && <span>{m.key}</span>}
    </span>
  );
}
