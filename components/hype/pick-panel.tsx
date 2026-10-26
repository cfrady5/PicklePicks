import Link from "next/link";
import { Clapperboard } from "lucide-react";
import type { HypeJob } from "@/lib/hype/types";
import { generateHypeForPick } from "@/app/actions/hype";
import { Button } from "@/components/ui/button";
import { HypeStatusBadge } from "./status-badge";
import { formatDateTime, formatMoney } from "@/lib/utils";

export function HypePickPanel({ pickId, jobs, enabled }: { pickId: string; jobs: HypeJob[]; enabled: boolean }) {
  const latest = jobs[0];
  return (
    <section className="card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold"><Clapperboard className="h-4 w-4 text-brand" /> Meme video agent</h2>
        <form action={generateHypeForPick}><input type="hidden" name="pickId" value={pickId} /><Button size="sm" type="submit" disabled={!enabled}>Generate hype video</Button></form>
      </div>
      <p className="mt-1 text-xs text-muted-2">{enabled ? "Picks the mascot or star, chooses a rights-safe format, renders with Higgsfield (≤ $2 cap), composes a branded cover and texts you the result." : "Publish the pick first."}</p>
      {latest ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
          <div><HypeStatusBadge status={latest.status} /> <span className="ml-2 text-xs text-muted">{formatDateTime(latest.createdAt)} · {latest.subject?.name ?? "resolving…"} · {formatMoney(latest.spentUsd)}</span></div>
          <Link href={`/admin/hype/${latest.id}`} className="text-xs font-semibold text-brand hover:underline">Open job</Link>
        </div>
      ) : null}
      {jobs.length > 1 && <p className="mt-2 text-xs text-muted">{jobs.length - 1} earlier job{jobs.length > 2 ? "s" : ""} · <Link href="/admin/hype" className="text-brand underline">all jobs</Link></p>}
    </section>
  );
}
