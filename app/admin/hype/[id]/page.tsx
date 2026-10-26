import Link from "next/link";
import { notFound } from "next/navigation";
import { getHypeStore } from "@/lib/hype/store";
import { HYPE_STEPS } from "@/lib/hype/types";
import { advanceHypeNow, retryHype, cancelHype } from "@/app/actions/hype";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { HypeStatusBadge } from "@/components/hype/status-badge";
import { LiveJob } from "@/components/hype/live-job";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatMoney, formatOdds, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
const ACTIVE = new Set(["queued", "running", "waiting_provider"]);

export default async function HypeJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getHypeStore().getJob(id);
  if (!job) notFound();
  const stepIdx = HYPE_STEPS.indexOf(job.step);
  return (
    <>
      <LiveJob id={job.id} status={job.status} />
      <Link href="/admin/hype" className="text-xs font-semibold text-muted hover:text-text">← All jobs</Link>
      <DashTitle eyebrow={`Hype job · ${job.mode}`} title={job.pick.selection} subtitle={`${job.pick.sport} · ${job.pick.matchup} · ${formatOdds(job.pick.odds)} · ${job.pick.stake.toFixed(1)}u`}>
        <div className="flex flex-wrap items-center gap-2">
          <HypeStatusBadge status={job.status} />
          {ACTIVE.has(job.status) && <form action={advanceHypeNow}><input type="hidden" name="id" value={job.id} /><Button size="sm" variant="secondary" type="submit">Advance now</Button></form>}
          {ACTIVE.has(job.status) && <form action={cancelHype}><input type="hidden" name="id" value={job.id} /><Button size="sm" variant="danger" type="submit">Cancel</Button></form>}
          {["failed", "budget_blocked", "canceled"].includes(job.status) && <form action={retryHype}><input type="hidden" name="id" value={job.id} /><Button size="sm" type="submit">Retry</Button></form>}
          <Button size="sm" variant="ghost" asChild><Link href={`/admin/picks/${job.pickId}`}>Pick</Link></Button>
        </div>
      </DashTitle>
      {job.error && <p className="mb-6 rounded-xl border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{job.error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Spent (est.)" value={formatMoney(job.spentUsd)} sub={`reserved ${formatMoney(job.reservedUsd)} · cap ${formatMoney(job.capUsd)}`} tone={job.spentUsd > job.capUsd ? "text-loss" : ""} />
        <StatTile label="Subject" value={job.subject?.name ?? "—"} sub={job.subject ? `${job.subject.kind} · ${job.subject.team} · ${job.subject.source}` : undefined} />
        <StatTile label="Format" value={job.format?.name ?? "—"} sub={job.format ? `${job.format.kind === "reference_clip" ? "reference clip" : `motion: ${job.format.motionName ?? "prompt"}`} · ${job.format.durationSec}s · ${job.format.resolution}` : undefined} />
        <StatTile label="Delivery" value={job.delivery ? (job.delivery.mode === "twilio" ? "Sent" : "Dry run") : "—"} sub={job.delivery ? `${job.delivery.to || "no phone set"} · ${formatDateTime(job.delivery.sentAt)}` : undefined} />
      </div>

      <section className="card mt-6 rounded-2xl p-5">
        <h2 className="font-display text-base font-bold">Pipeline</h2>
        <ol className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {HYPE_STEPS.map((s, i) => {
            const state = i < stepIdx || job.status === "completed" ? "done" : i === stepIdx ? (job.status === "failed" || job.status === "budget_blocked" ? "error" : "active") : "todo";
            return (
              <li key={s} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold capitalize", state === "done" && "border-win/40 bg-win/10 text-win", state === "active" && "border-brand bg-brand/15 text-brand", state === "error" && "border-loss/50 bg-loss/10 text-loss", state === "todo" && "border-border text-muted")}>
                {s.replace("_", " ")}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="space-y-6">
          <div className="card rounded-2xl p-5">
            <h2 className="font-display text-base font-bold">Assets</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Cover</div>
                {job.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={job.cover.url} target="_blank" rel="noreferrer"><img src={job.cover.url} alt="Branded cover" className="mt-2 w-full rounded-xl border border-border" /></a>
                ) : <p className="mt-2 text-sm text-muted-2">Not rendered yet.</p>}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Video</div>
                {job.assets?.videoUrl ? (
                  <video src={job.assets.videoUrl} controls playsInline className="mt-2 w-full rounded-xl border border-border" />
                ) : job.video?.status === "completed" && job.video.url && !job.video.url.startsWith("simulated://") ? (
                  <video src={job.video.url} controls playsInline className="mt-2 w-full rounded-xl border border-border" />
                ) : <p className="mt-2 text-sm text-muted-2">{job.mode === "simulated" ? "Simulated run — add HF_API_KEY / HF_API_SECRET to render real video." : job.video ? `Provider status: ${job.video.status}` : "Not started."}</p>}
              </div>
            </div>
            {job.image?.url && !job.image.url.startsWith("simulated://") && (
              <div className="mt-3 text-xs text-muted">Base image: <a className="text-brand underline" href={job.assets?.imageUrl ?? job.image.url} target="_blank" rel="noreferrer">open</a></div>
            )}
          </div>
          <div className="card rounded-2xl p-5">
            <h2 className="font-display text-base font-bold">Creative brief</h2>
            {job.brief ? (
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Hook</dt><dd className="font-display text-lg font-bold">{job.brief.hook}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Caption</dt><dd className="text-muted">{job.brief.caption}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Image prompt</dt><dd className="text-xs text-muted">{job.brief.imagePrompt}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Video prompt</dt><dd className="text-xs text-muted">{job.brief.videoPrompt}</dd></div>
                {job.format && <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Why this format</dt><dd className="text-xs text-muted">{job.format.rationale}</dd></div>}
              </dl>
            ) : <p className="mt-2 text-sm text-muted-2">Pending.</p>}
          </div>
        </section>
        <section className="space-y-6">
          <div className="card rounded-2xl p-5">
            <h2 className="font-display text-base font-bold">Budget ledger</h2>
            <Table>
              <THead><TR><TH>When</TH><TH>Step</TH><TH>Kind</TH><TH>Note</TH><TH className="text-right">USD</TH></TR></THead>
              <TBody>
                {job.ledger.map((l, i) => <TR key={i}><TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(l.at)}</TD><TD className="text-xs">{l.step}</TD><TD><Badge variant={l.kind === "settle" ? "win" : l.kind === "release" ? "push" : "pending"}>{l.kind}</Badge></TD><TD className="text-xs text-muted">{l.note}</TD><TD className="tabular text-right text-xs">{formatMoney(l.usd)}</TD></TR>)}
                {job.ledger.length === 0 && <TR><TD colSpan={5} className="py-4 text-center text-xs text-muted">No reservations yet.</TD></TR>}
              </TBody>
            </Table>
          </div>
          <div className="card rounded-2xl p-5">
            <h2 className="font-display text-base font-bold">Events</h2>
            <ol className="mt-3 space-y-1.5 text-xs">
              {[...job.events].reverse().map((e, i) => <li key={i} className={cn("flex gap-2", e.level === "error" && "text-loss", e.level === "warn" && "text-pending", e.level === "info" && "text-muted")}><span className="shrink-0 tabular">{new Date(e.at).toLocaleTimeString()}</span><span>{e.message}</span></li>)}
            </ol>
          </div>
          {job.delivery && (
            <div className="card rounded-2xl p-5">
              <h2 className="font-display text-base font-bold">Text message {job.delivery.mode === "dry_run" && <Badge variant="demo" className="ml-2">dry run</Badge>}</h2>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-bg-2 p-3 text-xs text-text/90">{job.delivery.body}</pre>
              {job.delivery.mediaUrls.length > 0 && <p className="mt-2 text-xs text-muted">MMS media: {job.delivery.mediaUrls.join(", ")}</p>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
