"use client";
import { useActionState } from "react";
import type { Pick } from "@/lib/data/types";
import { settlePick, correctSettlement, voidPick, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { settleUnits } from "@/lib/odds";
import { formatUnits } from "@/lib/utils";

function Msg({ state }: { state: AdminState }) {
  if (state?.error) return <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Recorded.</p>;
  return null;
}

const RESULTS = ["win", "loss", "push", "void"] as const;

function ResultPicker({ name, pick, defaultValue }: { name: string; pick: Pick; defaultValue?: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RESULTS.map((r) => (
        <label key={r} className="cursor-pointer">
          <input type="radio" name={name} value={r} defaultChecked={defaultValue === r} required className="peer sr-only" />
          <span className="block rounded-xl border border-border px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted transition peer-checked:border-brand peer-checked:bg-brand/15 peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
            {r}<span className="tabular block text-[10px] font-semibold normal-case opacity-80">{formatUnits(settleUnits(r, pick.odds, pick.stake))}u</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function SettleForm({ pick }: { pick: Pick }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(settlePick, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={pick.id} />
      <Field label="Result" hint="Net units are calculated automatically from the published odds and stake."><ResultPicker name="result" pick={pick} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Final score (optional)"><Input name="finalScore" placeholder="112-108" /></Field><Field label="Note (optional)"><Input name="note" /></Field></div>
      <Msg state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Settling…" : "Settle pick"}</Button>
      <p className="text-xs text-muted-2">Settling records the result, the timestamp and your identity, updates all public statistics and member dashboards, settles mirrored tracker bets, and notifies subscribers.</p>
    </form>
  );
}

export function CorrectForm({ pick }: { pick: Pick }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(correctSettlement, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={pick.id} />
      <Field label="Corrected result"><ResultPicker name="result" pick={pick} defaultValue={pick.result} /></Field>
      <Field label="Final score"><Input name="finalScore" defaultValue={pick.finalScore ?? ""} /></Field>
      <Field label="Reason (required, public)"><Textarea name="reason" required minLength={5} placeholder="e.g. Stat correction issued by the league on 10/22." /></Field>
      <Msg state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Recording…" : "Record correction"}</Button>
      <p className="text-xs text-muted-2">The previous settlement stays visible in the audit trail, marked as superseded.</p>
    </form>
  );
}

export function VoidForm({ pick }: { pick: Pick }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(voidPick, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={pick.id} />
      <Field label="Reason (required, public)"><Input name="reason" required minLength={5} placeholder="Game postponed / line pulled" /></Field>
      <Msg state={state} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>{pending ? "Voiding…" : "Void pick (0u)"}</Button>
    </form>
  );
}
