"use client";
import * as React from "react";
import { useActionState } from "react";
import type { Pick } from "@/lib/data/types";
import { SPORTS, BET_TYPES } from "@/lib/constants";
import { createPick, updatePick, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function localInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PickForm({ pick }: { pick?: Pick }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(pick ? updatePick : createPick, undefined);
  const [intent, setIntent] = React.useState<"draft" | "schedule" | "publish">(pick?.status === "scheduled" ? "schedule" : "draft");
  const [sport, setSport] = React.useState<string>(pick?.sport ?? "NBA");
  const league = SPORTS.find((s) => s.key === sport)?.league ?? "";
  return (
    <form action={action} className="space-y-6">
      {pick && <input type="hidden" name="id" value={pick.id} />}
      <input type="hidden" name="intent" value={intent} />
      <section className="card rounded-2xl p-6">
        <h2 className="font-display text-base font-bold">Matchup</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sport"><Select name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Field label="League"><Input name="league" key={league} defaultValue={pick?.league ?? league} required /></Field>
          <Field label="Away team / player"><Input name="awayTeam" defaultValue={pick?.awayTeam ?? ""} required /></Field>
          <Field label="Home team / opponent"><Input name="homeTeam" defaultValue={pick?.homeTeam ?? ""} required /></Field>
          <Field label="Scheduled start" className="sm:col-span-2"><Input name="startTime" type="datetime-local" defaultValue={localInput(pick?.startTime)} required /></Field>
          <Field label="Sportsbook reference"><Input name="sportsbook" defaultValue={pick?.sportsbook ?? "DraftKings"} /></Field>
          <Field label="Visibility"><Select name="isPremium" defaultValue={pick?.isPremium === false ? "off" : "on"}><option value="on">Premium (members only until settled)</option><option value="off">Free (public immediately)</option></Select></Field>
        </div>
      </section>
      <section className="card rounded-2xl p-6">
        <h2 className="font-display text-base font-bold">The bet</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Bet type"><Select name="betType" defaultValue={pick?.betType ?? "spread"}>{BET_TYPES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}</Select></Field>
          <Field label="Selection" className="sm:col-span-2" hint="Exactly as a member should bet it, e.g. 'Tyrese Haliburton Over 8.5 Assists'"><Input name="selection" defaultValue={pick?.selection ?? ""} required minLength={2} /></Field>
          <Field label="Line (optional)"><Input name="line" defaultValue={pick?.line ?? ""} placeholder="-3.5 / O224.5" /></Field>
          <Field label="Odds (American)" hint="-110, +150…"><Input name="odds" type="number" step="1" defaultValue={pick?.odds ?? -110} required /></Field>
          <Field label="Stake (units)" hint="0.5 – 3 typical"><Input name="stake" type="number" step="0.1" min="0.1" max="10" defaultValue={pick?.stake ?? 1} required /></Field>
          <Field label="Confidence tier" className="sm:col-span-2"><Select name="confidence" defaultValue={pick?.confidence ?? "play"}><option value="lean">Lean (small)</option><option value="play">Play (standard)</option><option value="strong">Strong (larger)</option></Select></Field>
        </div>
      </section>
      <section className="card rounded-2xl p-6">
        <h2 className="font-display text-base font-bold">Analysis</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Field label="Written reasoning" hint="This is frozen at publication and shown to members verbatim."><Textarea name="analysis" rows={8} defaultValue={pick?.analysis ?? ""} required minLength={20} /></Field>
          <div className="space-y-4">
            <Field label="Key statistical indicators" hint="One per line as Label: Value"><Textarea name="keyStats" rows={5} defaultValue={pick?.keyStats.map((k) => `${k.label}: ${k.value}`).join("\n") ?? ""} placeholder={"Model line: -4.5\nMarket line: -3\nEdge: 1.5 pts"} /></Field>
            <Field label="Confidence methodology note"><Textarea name="confidenceNote" rows={3} defaultValue={pick?.confidenceNote ?? "Confidence tiers (Lean / Play / Strong) reflect recommended unit sizing from our internal process. They are not calibrated win probabilities and are not guarantees."} /></Field>
          </div>
        </div>
      </section>
      <section className="card rounded-2xl border-brand/30 p-6">
        <h2 className="font-display text-base font-bold">Release</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <div className="flex flex-wrap gap-2">
            {(["draft", "schedule", "publish"] as const).map((i) => <button key={i} type="button" onClick={() => setIntent(i)} className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition ${intent === i ? "border-brand bg-brand/15 text-brand" : "border-border text-muted hover:text-text"}`}>{i === "draft" ? "Save as draft" : i === "schedule" ? "Schedule release" : "Publish now"}</button>)}
          </div>
          {intent === "schedule" && <Field label="Release at"><Input name="scheduledFor" type="datetime-local" defaultValue={localInput(pick?.scheduledFor)} required /></Field>}
        </div>
        <p className="mt-3 text-xs text-muted-2">{intent === "publish" ? "Publishing freezes the selection, odds, stake and analysis, records a timestamped snapshot, and notifies subscribers. This cannot be undone." : intent === "schedule" ? "The pick will be published automatically at the release time by the scheduled job, or immediately via 'Release due' on the overview." : "Drafts are private and fully editable."}</p>
        {state?.error && <p role="alert" className="mt-4 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>}
        {state?.ok && <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Saved.</p>}
        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : intent === "publish" ? "Publish pick" : intent === "schedule" ? "Schedule pick" : "Save draft"}</Button>
          {pick && <Badge variant="outline">Editing {pick.status}</Badge>}
        </div>
      </section>
    </form>
  );
}
