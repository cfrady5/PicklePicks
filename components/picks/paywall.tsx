import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PickleIcon } from "@/components/brand/pickle-icon";

export function Paywall({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-card-2 via-card to-bg-2 p-6 text-center sm:p-10">
      <div aria-hidden className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-brand"><Lock className="h-5 w-5" /></div>
        <h3 className="mt-4 font-display text-2xl font-extrabold">{count > 0 ? `${count} premium pick${count === 1 ? "" : "s"} in the jar` : "The jar is locked"}</h3>
        <p className="mt-2 text-sm text-muted">
          {compact ? "Members get the full selection, odds, sizing and written analysis." : "Members see the full selection, odds, recommended sizing, confidence tier and written analysis for every pick — plus the personal tracker and analytics."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild><Link href="/pricing"><PickleIcon /> Open the jar</Link></Button>
          <Button variant="secondary" asChild><Link href="/results">See the full record first</Link></Button>
        </div>
      </div>
    </div>
  );
}
