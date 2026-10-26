import Link from "next/link";
import { getHypeStore } from "@/lib/hype/store";
import { HYPE_SETTINGS } from "@/lib/hype/pipeline";
import { PRICES } from "@/lib/hype/budget";
import { higgsfieldConfigured } from "@/lib/hype/higgsfield";
import { twilioConfigured } from "@/lib/hype/sms";
import { teamCount } from "@/lib/hype/teams";
import { RECIPES } from "@/lib/hype/formats";
import { toggleMemeReference } from "@/app/actions/hype";
import { DashTitle, StatTile } from "@/components/dashboard/page-title";
import { HypeStatusBadge } from "@/components/hype/status-badge";
import { ReferenceForm } from "@/components/hype/reference-form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHypePage() {
  const store = getHypeStore();
  const [jobs, refs] = await Promise.all([store.listJobs({ limit: 100 }), store.listReferences()]);
  const spent = jobs.reduce((a, j) => a + j.spentUsd, 0);
  const completed = jobs.filter((j) => j.status === "completed");
  const hf = higgsfieldConfigured(), tw = twilioConfigured();
  return (
    <>
      <DashTitle eyebrow="Content agent" title="Meme video agent" subtitle="Pick in → mascot or star chosen → rights-safe format → Higgsfield render → branded cover → text to your phone. Every paid step is reserved against a per-pick cap.">
        <div className="flex flex-wrap gap-2">
          <Badge variant={hf ? "win" : "demo"}>{hf ? "Higgsfield: live" : "Higgsfield: simulated (no HF_API_KEY)"}</Badge>
          <Badge variant={tw ? "win" : "demo"}>{tw ? "Twilio: live" : "Twilio: dry run"}</Badge>
        </div>
      </DashTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Per-pick cap" value={formatMoney(PRICES.maxSpendUsd)} sub={`${HYPE_SETTINGS.provider === "genjutsu_light" ? "Genjutsu Light" : "DoP"} · ${HYPE_SETTINGS.resolution} · ${HYPE_SETTINGS.durationSec}s · 9:16`} />
        <StatTile label="Jobs" value={String(jobs.length)} sub={`${completed.length} completed · ${jobs.filter((j) => j.status === "budget_blocked").length} budget blocked · ${jobs.filter((j) => j.status === "failed").length} failed`} />
        <StatTile label="Estimated spend" value={formatMoney(spent)} sub={completed.length ? `avg ${formatMoney(spent / Math.max(1, completed.length))} per completed job` : "Reconcile against provider invoices"} />
        <StatTile label="Library" value={`${teamCount()} teams · ${RECIPES.length} formats`} sub={`${refs.filter((r) => r.active).length} rights-cleared reference clips · policy ${HYPE_SETTINGS.subjectPolicy}`} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Jobs</h2><span className="text-xs text-muted">Start a job from any pick&rsquo;s admin page.</span></div>
        <Table>
          <THead><TR><TH>Created</TH><TH>Pick</TH><TH>Subject</TH><TH>Format</TH><TH>Status</TH><TH className="text-right">Spent / cap</TH><TH /></TR></THead>
          <TBody>
            {jobs.map((j) => (
              <TR key={j.id}>
                <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(j.createdAt)}</TD>
                <TD><div className="font-semibold">{j.pick.selection}</div><div className="text-xs text-muted">{j.pick.sport} · {j.pick.matchup}</div></TD>
                <TD className="text-sm">{j.subject ? `${j.subject.name}` : "—"}</TD>
                <TD className="text-sm">{j.format?.name ?? "—"}</TD>
                <TD><HypeStatusBadge status={j.status} />{j.mode === "simulated" && <Badge variant="demo" className="ml-1">Sim</Badge>}</TD>
                <TD className="tabular text-right text-sm">{formatMoney(j.spentUsd)} / {formatMoney(j.capUsd)}</TD>
                <TD className="text-right"><Button size="sm" variant="secondary" asChild><Link href={`/admin/hype/${j.id}`}>Open</Link></Button></TD>
              </TR>
            ))}
            {jobs.length === 0 && <TR><TD colSpan={7} className="py-8 text-center text-muted">No jobs yet. Open a published pick and press &ldquo;Generate hype video&rdquo;.</TD></TR>}
          </TBody>
        </Table>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="font-display text-lg font-bold">Rights-cleared reference clips</h2>
          <p className="mb-3 text-xs text-muted-2">Used for Genjutsu Light motion transfer. The agent never scrapes or reuses arbitrary viral videos; it only matches formats against clips you are licensed to reuse. If none fit, it falls back to Higgsfield&rsquo;s own licensed motion presets.</p>
          <ul className="space-y-2">
            {refs.map((r) => (
              <li key={r.id} className="card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                <div className="min-w-0"><div className="truncate font-semibold">{r.title} <span className="text-xs text-muted">· {r.durationSec}s · {r.mood || "any mood"}</span></div><div className="truncate text-xs text-muted">{r.tags.join(", ") || "no tags"} · {r.sports.join(", ") || "any sport"} · {r.licenseNote}</div></div>
                <form action={toggleMemeReference}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="active" value={String(!r.active)} /><Button size="sm" variant={r.active ? "secondary" : "outline"} type="submit">{r.active ? "Active" : "Inactive"}</Button></form>
              </li>
            ))}
            {refs.length === 0 && <li className="card rounded-xl p-6 text-sm text-muted">Library is empty — jobs will use Higgsfield motion presets.</li>}
          </ul>
        </div>
        <aside className="card h-fit rounded-2xl p-5"><h3 className="font-display text-base font-bold">Add a reference clip</h3><div className="mt-3"><ReferenceForm /></div></aside>
      </section>
    </>
  );
}
