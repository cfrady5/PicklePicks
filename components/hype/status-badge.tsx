import { Badge } from "@/components/ui/badge";
import type { HypeStatus } from "@/lib/hype/types";

export function HypeStatusBadge({ status }: { status: HypeStatus }) {
  const map: Record<HypeStatus, { v: "win" | "loss" | "pending" | "push" | "brand" | "default"; label: string }> = {
    queued: { v: "default", label: "Queued" },
    running: { v: "brand", label: "Running" },
    waiting_provider: { v: "pending", label: "Rendering" },
    budget_blocked: { v: "loss", label: "Budget blocked" },
    failed: { v: "loss", label: "Failed" },
    completed: { v: "win", label: "Completed" },
    canceled: { v: "push", label: "Canceled" },
  };
  const m = map[status];
  return <Badge variant={m.v}>{m.label}</Badge>;
}
