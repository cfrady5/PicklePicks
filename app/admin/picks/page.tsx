import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getRepo } from "@/lib/data";
import { DashTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResultBadge } from "@/components/picks/status-badge";
import { SportBadge } from "@/components/picks/sport-badge";
import { formatDateTime, formatOdds, formatUnits, cn } from "@/lib/utils";

const STATUSES = ["all", "draft", "scheduled", "published", "settled", "voided"] as const;

export default async function AdminPicksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const all = await getRepo().listAllPicks();
  const list = status === "all" ? all : all.filter((p) => p.status === status);
  return (
    <>
      <DashTitle eyebrow="Ledger management" title="Picks" subtitle="Drafts and scheduled picks are editable. Published picks are frozen; settle them or record a correction with a reason.">
        <Button asChild><Link href="/admin/picks/new"><PlusCircle className="h-4 w-4" /> New pick</Link></Button>
      </DashTitle>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border bg-bg-2 p-1 w-fit">
        {STATUSES.map((s) => <Link key={s} href={`/admin/picks?status=${s}`} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold capitalize", status === s ? "bg-brand text-bg" : "text-muted hover:text-text")}>{s} <span className="opacity-60">({s === "all" ? all.length : all.filter((p) => p.status === s).length})</span></Link>)}
      </div>
      <Table>
        <THead><TR><TH>Start</TH><TH>Sport</TH><TH>Pick</TH><TH className="text-right">Odds</TH><TH className="text-right">Stake</TH><TH>Status</TH><TH className="text-right">Net</TH><TH /></TR></THead>
        <TBody>
          {list.map((p) => (
            <TR key={p.id}>
              <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(p.startTime)}</TD>
              <TD><SportBadge sport={p.sport} /></TD>
              <TD><div className="font-semibold">{p.selection}</div><div className="text-xs text-muted">{p.matchup}{p.status === "scheduled" && p.scheduledFor && <> · releases {formatDateTime(p.scheduledFor)}</>}</div></TD>
              <TD className="tabular text-right">{formatOdds(p.odds)}</TD>
              <TD className="tabular text-right">{p.stake}u</TD>
              <TD><ResultBadge result={p.result} status={p.status} /></TD>
              <TD className={cn("tabular text-right font-bold", p.netUnits > 0 ? "text-win" : p.netUnits < 0 ? "text-loss" : "text-muted")}>{p.status === "settled" ? `${formatUnits(p.netUnits)}u` : "—"}</TD>
              <TD className="text-right"><Button size="sm" variant="secondary" asChild><Link href={`/admin/picks/${p.id}`}>{p.status === "published" ? "Settle" : p.status === "draft" || p.status === "scheduled" ? "Edit" : "View"}</Link></Button></TD>
            </TR>
          ))}
          {list.length === 0 && <TR><TD colSpan={8} className="py-10 text-center text-muted">No picks with this status.</TD></TR>}
        </TBody>
      </Table>
    </>
  );
}
