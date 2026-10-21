"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import type { Pick } from "@/lib/data/types";
import { SPORTS, BET_TYPES } from "@/lib/constants";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { ResultBadge, DemoTag } from "@/components/picks/status-badge";
import { SportBadge } from "@/components/picks/sport-badge";
import { formatDate, formatOdds, formatUnits, cn } from "@/lib/utils";

type SortKey = "date" | "sport" | "odds" | "stake" | "net";
type ResultFilter = "all" | "win" | "loss" | "push" | "pending";
type SortState = { key: SortKey; dir: 1 | -1 };

function SortTh({ k, sort, toggle, children, className }: { k: SortKey; sort: SortState; toggle: (k: SortKey) => void; children: React.ReactNode; className?: string }) {
  return (
    <TH className={className}>
      <button type="button" onClick={() => toggle(k)} className={cn("inline-flex items-center gap-1 hover:text-text", sort.key === k && "text-brand")}>
        {children} <ArrowUpDown className="h-3 w-3" />
      </button>
    </TH>
  );
}

export function PicksTable({ picks, pageSize = 25, showPending = true, title }: { picks: Pick[]; pageSize?: number; showPending?: boolean; title?: string }) {
  const [q, setQ] = React.useState("");
  const [sport, setSport] = React.useState("all");
  const [betType, setBetType] = React.useState("all");
  const [result, setResult] = React.useState<ResultFilter>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [sort, setSort] = React.useState<SortState>({ key: "date", dir: -1 });
  const [page, setPage] = React.useState(1);

  const rows = React.useMemo(() => {
    let list = picks;
    if (!showPending) list = list.filter((p) => p.status === "settled" || p.status === "voided");
    if (sport !== "all") list = list.filter((p) => p.sport === sport);
    if (betType !== "all") list = list.filter((p) => p.betType === betType);
    if (result !== "all") list = list.filter((p) => (result === "pending" ? p.result === "pending" : p.result === result));
    if (from) list = list.filter((p) => p.startTime >= `${from}T00:00:00`);
    if (to) list = list.filter((p) => p.startTime <= `${to}T23:59:59`);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => `${p.matchup} ${p.selection} ${p.sport} ${p.sportsbook}`.toLowerCase().includes(s));
    }
    const dir = sort.dir;
    return [...list].sort((a, b) => {
      switch (sort.key) {
        case "sport": return a.sport.localeCompare(b.sport) * dir;
        case "odds": return (a.odds - b.odds) * dir;
        case "stake": return (a.stake - b.stake) * dir;
        case "net": return (a.netUnits - b.netUnits) * dir;
        default: return a.startTime.localeCompare(b.startTime) * dir;
      }
    });
  }, [picks, q, sport, betType, result, from, to, sort, showPending]);

  const filterKey = `${q}|${sport}|${betType}|${result}|${from}|${to}`;
  const [seenFilterKey, setSeenFilterKey] = React.useState(filterKey);
  if (seenFilterKey !== filterKey) { setSeenFilterKey(filterKey); setPage(1); }
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  const totals = React.useMemo(() => rows.reduce((a, p) => ({ net: a.net + p.netUnits, staked: a.staked + (p.result === "win" || p.result === "loss" ? p.stake : 0) }), { net: 0, staked: 0 }), [rows]);

  return (
    <div className="card rounded-2xl p-5">
      {title && <h3 className="font-display text-lg font-bold">{title}</h3>}
      <div className={cn("flex flex-wrap items-center gap-2", title && "mt-4")}>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matchup, selection, book…" className="h-10 pl-9" aria-label="Search picks" />
        </div>
        <Segmented value={result} onChange={setResult} options={[{ value: "all", label: "All" }, { value: "win", label: "Wins" }, { value: "loss", label: "Losses" }, { value: "push", label: "Pushes" }, ...(showPending ? [{ value: "pending" as const, label: "Pending" }] : [])]} />
        <Select value={sport} onChange={(e) => setSport(e.target.value)} className="h-10 w-auto py-0 text-xs" aria-label="Sport"><option value="all">All sports</option>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
        <Select value={betType} onChange={(e) => setBetType(e.target.value)} className="h-10 w-auto py-0 text-xs" aria-label="Bet type"><option value="all">All bet types</option>{BET_TYPES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-auto text-xs" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-auto text-xs" aria-label="To date" />
      </div>
      <div className="mt-4">
        <Table>
          <THead>
            <TR>
              <SortTh k="date" sort={sort} toggle={toggle}>Date</SortTh>
              <SortTh k="sport" sort={sort} toggle={toggle}>Sport</SortTh>
              <TH>Pick</TH>
              <SortTh k="odds" sort={sort} toggle={toggle} className="text-right">Odds</SortTh>
              <SortTh k="stake" sort={sort} toggle={toggle} className="text-right">Stake</SortTh>
              <TH>Result</TH>
              <SortTh k="net" sort={sort} toggle={toggle} className="text-right">Net Units</SortTh>
            </TR>
          </THead>
          <TBody>
            {visible.map((p) => (
              <TR key={p.id}>
                <TD className="whitespace-nowrap text-muted">{formatDate(p.startTime)}</TD>
                <TD><SportBadge sport={p.sport} /></TD>
                <TD>
                  <Link href={`/picks/${p.id}`} className="group block">
                    <div className="font-semibold group-hover:text-brand">{p.selection}</div>
                    <div className="text-xs text-muted">{p.matchup} {p.isDemo && <DemoTag show />}</div>
                  </Link>
                </TD>
                <TD className="tabular text-right">{formatOdds(p.odds)}</TD>
                <TD className="tabular text-right">{p.stake.toFixed(1)}u</TD>
                <TD><ResultBadge result={p.result} status={p.status} /></TD>
                <TD className={cn("tabular text-right font-bold", p.netUnits > 0 ? "text-win" : p.netUnits < 0 ? "text-loss" : "text-muted")}>{p.result === "pending" ? "—" : `${formatUnits(p.netUnits)}u`}</TD>
              </TR>
            ))}
            {visible.length === 0 && <TR><TD colSpan={7} className="py-10 text-center text-muted">No picks match these filters.</TD></TR>}
          </TBody>
        </Table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div>
          {rows.length.toLocaleString()} pick{rows.length === 1 ? "" : "s"} · staked {totals.staked.toFixed(2)}u · net <span className={cn("tabular font-bold", totals.net > 0 ? "text-win" : totals.net < 0 ? "text-loss" : "")}>{formatUnits(totals.net)}u</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-2.5 py-1 font-semibold hover:text-text disabled:opacity-40">Prev</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-2.5 py-1 font-semibold hover:text-text disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
