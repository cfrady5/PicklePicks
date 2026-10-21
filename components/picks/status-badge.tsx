import { Badge } from "@/components/ui/badge";
import type { PickResult, PickStatus } from "@/lib/data/types";

export function ResultBadge({ result, status, className }: { result: PickResult; status?: PickStatus; className?: string }) {
  if (status === "voided" || result === "void") return <Badge variant="push" className={className}>Void</Badge>;
  if (status === "draft") return <Badge variant="default" className={className}>Draft</Badge>;
  if (status === "scheduled") return <Badge variant="default" className={className}>Scheduled</Badge>;
  switch (result) {
    case "win": return <Badge variant="win" className={className}>Win</Badge>;
    case "loss": return <Badge variant="loss" className={className}>Loss</Badge>;
    case "push": return <Badge variant="push" className={className}>Push</Badge>;
    default: return <Badge variant="pending" className={className}>Pending</Badge>;
  }
}

export function DemoTag({ show }: { show?: boolean }) {
  if (!show) return null;
  return <Badge variant="demo" title="Generated sample record for development — not a real pick">Demo data</Badge>;
}

export function ConfidenceBadge({ tier }: { tier: "lean" | "play" | "strong" }) {
  const map = { lean: { label: "Lean", cls: "text-muted border-border-strong" }, play: { label: "Play", cls: "text-accent border-accent/40 bg-accent/10" }, strong: { label: "Strong", cls: "text-brand border-brand/40 bg-brand/10" } } as const;
  const m = map[tier];
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
}
