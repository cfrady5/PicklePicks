import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, History, FileCheck2 } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getEntitlement } from "@/lib/auth";
import { PickCard } from "@/components/picks/pick-card";
import { Paywall } from "@/components/picks/paywall";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatOdds, formatUnits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const pick = await getRepo().getPick(id);
  if (!pick) return { title: "Pick not found" };
  return { title: `${pick.sport}: ${pick.selection} (${formatOdds(pick.odds)}) — ${pick.result === "pending" ? "Pending" : pick.result.toUpperCase()}` };
}

export default async function PickRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepo();
  const [pick, ent] = await Promise.all([repo.getPick(id), getEntitlement()]);
  if (!pick || pick.status === "draft" || pick.status === "scheduled") notFound();
  const locked = pick.status === "published" && pick.isPremium && !ent.isSubscriber;
  const history = await repo.getPickHistory(id);

  return (
    <Section className="max-w-4xl py-10 lg:py-14">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/results" className="hover:text-text">The Pickle&rsquo;s Record</Link><span>/</span><span>Verified pick record</span>
        <Badge variant="brand" className="ml-auto"><ShieldCheck className="h-3 w-3" /> Immutable record</Badge>
      </div>

      {locked ? (
        <>
          <div className="card rounded-2xl p-5">
            <div className="text-sm text-muted">{pick.sport} · {pick.matchup} · starts {formatDateTime(pick.startTime)}</div>
            <div className="mt-1 font-display text-xl font-extrabold">Premium pick — pending</div>
            <div className="mt-1 text-xs text-muted-2">Published {pick.publishedAt && formatDateTime(pick.publishedAt)}. Selection, odds and analysis are visible to members until the pick is settled, at which point the full record becomes public.</div>
          </div>
          <div className="mt-4"><Paywall count={1} compact /></div>
        </>
      ) : (
        <PickCard pick={pick} defaultOpen />
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><FileCheck2 className="h-4 w-4 text-brand" /> Publication</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.publications.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between"><span className="font-semibold">Revision {p.revision}</span><span className="text-xs text-muted">{formatDateTime(p.publishedAt)}</span></div>
                {!locked && <div className="mt-1 text-xs text-muted">Snapshot: {p.snapshot.selection} @ {formatOdds(p.snapshot.odds)} · {p.snapshot.stake.toFixed(1)}u</div>}
                {p.reason && <div className="mt-1 text-xs text-pending">Reason: {p.reason}</div>}
              </li>
            ))}
            {history.publications.length === 0 && <li className="text-muted-2">No publication snapshot recorded.</li>}
          </ul>
        </div>
        <div className="card rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><History className="h-4 w-4 text-brand" /> Settlement</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.settlements.map((s) => (
              <li key={s.id} className={`rounded-lg border p-3 ${s.supersededBy ? "border-border opacity-60" : "border-border-strong"}`}>
                <div className="flex items-center justify-between"><span className="font-semibold uppercase">{s.result} · <span className="tabular">{formatUnits(s.netUnits)}u</span></span><span className="text-xs text-muted">{formatDateTime(s.settledAt)}</span></div>
                {s.finalScore && <div className="mt-1 text-xs text-muted">Final: {s.finalScore}</div>}
                {s.note && <div className="mt-1 text-xs text-muted">Note: {s.note}</div>}
                {s.supersededBy && <div className="mt-1 text-[11px] font-semibold text-pending">Superseded by a correction</div>}
              </li>
            ))}
            {history.settlements.length === 0 && <li className="text-muted-2">Not settled yet.</li>}
          </ul>
        </div>
      </div>

      <div className="card mt-4 rounded-2xl p-5">
        <h2 className="font-display text-base font-bold">Audit trail</h2>
        <ol className="mt-3 space-y-0 border-l border-border pl-4 text-sm">
          {history.audit.map((a) => (
            <li key={a.id} className="relative pb-3">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-brand" />
              <div className="flex flex-wrap items-center gap-x-2"><span className="font-semibold capitalize">{a.action}</span><span className="text-xs text-muted">by {a.actorName || "system"} · {formatDateTime(a.createdAt)}</span></div>
              {a.reason && <div className="text-xs text-pending">Reason: {a.reason}</div>}
              {a.before && <div className="text-[11px] text-muted-2">Before: {JSON.stringify(a.before)}</div>}
              {a.after && !locked && <div className="text-[11px] text-muted-2">After: {JSON.stringify(a.after)}</div>}
            </li>
          ))}
          {history.audit.length === 0 && <li className="text-muted-2">No audit entries.</li>}
        </ol>
      </div>
    </Section>
  );
}
