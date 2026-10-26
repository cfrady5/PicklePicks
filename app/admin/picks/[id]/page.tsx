import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { publishPickNow } from "@/app/actions/admin";
import { DashTitle } from "@/components/dashboard/page-title";
import { PickForm } from "@/components/admin/pick-form";
import { PickCard } from "@/components/picks/pick-card";
import { SettleForm, CorrectForm, VoidForm } from "@/components/admin/settle-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatUnits } from "@/lib/utils";
import { getHypeStore } from "@/lib/hype/store";
import { HypePickPanel } from "@/components/hype/pick-panel";

export default async function AdminPickPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const repo = getRepo();
  const pick = await repo.getPick(id);
  if (!pick) notFound();
  const [history, hypeJobs] = await Promise.all([repo.getPickHistory(id), getHypeStore().listJobs({ pickId: id, limit: 10 })]);
  const editable = pick.status === "draft" || pick.status === "scheduled";

  return (
    <>
      <DashTitle eyebrow={`Pick · ${pick.status}`} title={pick.selection} subtitle={`${pick.matchup} · ${formatDateTime(pick.startTime)}`}>
        <div className="flex items-center gap-2">
          {pick.publishedAt && <Button variant="secondary" size="sm" asChild><Link href={`/picks/${pick.id}`}>Public record</Link></Button>}
          {editable && <form action={publishPickNow}><input type="hidden" name="id" value={pick.id} /><Button size="sm" type="submit">Publish now</Button></form>}
        </div>
      </DashTitle>
      {saved && <div className="mb-6 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">Pick saved.</div>}

      {editable ? (
        <PickForm pick={pick} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div><PickCard pick={pick} defaultOpen /><p className="mt-3 text-xs text-muted-2">Published {pick.publishedAt && formatDateTime(pick.publishedAt)} — betting fields are frozen. Corrections are logged with a reason.</p></div>
          <div className="space-y-6">
            {pick.status === "published" && (
              <section className="card rounded-2xl border-brand/30 p-5"><h2 className="font-display text-base font-bold">Settle this pick</h2><div className="mt-4"><SettleForm pick={pick} /></div></section>
            )}
            {pick.status === "settled" && (
              <section className="card rounded-2xl p-5">
                <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold">Settled</h2><Badge variant={pick.result === "win" ? "win" : pick.result === "loss" ? "loss" : "push"}>{pick.result} · {formatUnits(pick.netUnits)}u</Badge></div>
                <p className="mt-1 text-xs text-muted">{pick.settledAt && formatDateTime(pick.settledAt)}{pick.finalScore ? ` · Final ${pick.finalScore}` : ""}</p>
                <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">Record a correction</h3>
                <div className="mt-3"><CorrectForm pick={pick} /></div>
              </section>
            )}
            <HypePickPanel pickId={pick.id} jobs={hypeJobs} enabled={Boolean(pick.publishedAt)} />
            {pick.status !== "voided" && (
              <section className="card rounded-2xl p-5"><h2 className="font-display text-base font-bold">Void</h2><p className="mt-1 text-xs text-muted">For postponed games or pulled lines. Returns the stake (0u) and stays on the public ledger.</p><div className="mt-3"><VoidForm pick={pick} /></div></section>
            )}
          </div>
        </div>
      )}

      <section className="card mt-8 rounded-2xl p-5">
        <h2 className="font-display text-base font-bold">Audit trail</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {history.audit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-border pb-2 last:border-0">
              <span className="font-semibold capitalize">{a.action}</span><span className="text-xs text-muted">{a.actorName || "system"} · {formatDateTime(a.createdAt)}</span>
              {a.reason && <span className="w-full text-xs text-pending">Reason: {a.reason}</span>}
              {(a.before || a.after) && <span className="w-full text-[11px] text-muted-2">{a.before ? `before ${JSON.stringify(a.before)} ` : ""}{a.after ? `after ${JSON.stringify(a.after)}` : ""}</span>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
