"use client";
import * as React from "react";
import { useActionState } from "react";
import { ClipboardCheck, ClipboardPlus } from "lucide-react";
import type { Pick, TrackedBet } from "@/lib/data/types";
import { saveTrackedBet, type ActionState } from "@/app/actions/member";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input, Field, Select } from "@/components/ui/input";
import { formatOdds } from "@/lib/utils";

export function TrackBetButton({ pick, tracked, existing }: { pick: Pick; tracked: boolean; existing?: TrackedBet }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTrackedBet, undefined);
  const [seenState, setSeenState] = React.useState(state);
  if (seenState !== state) { setSeenState(state); if (state?.ok) setOpen(false); }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={tracked ? "secondary" : "outline"}>{tracked ? <><ClipboardCheck className="h-4 w-4" /> Tracked — edit</> : <><ClipboardPlus className="h-4 w-4" /> I tailed this</>}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track this bet</DialogTitle>
          <DialogDescription>{pick.selection} · published at {formatOdds(pick.odds)}. Enter what you actually got — your tracker uses your numbers, not ours.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="pickId" value={pick.id} />
          {existing && <input type="hidden" name="id" value={existing.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Odds received" hint="American, e.g. -110 or +150"><Input name="oddsReceived" type="number" step="1" defaultValue={existing?.oddsReceived ?? pick.odds} required /></Field>
            <Field label="Stake ($)"><Input name="stakeAmount" type="number" step="0.01" min="0" defaultValue={existing?.stakeAmount ?? ""} placeholder="25.00" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sportsbook"><Input name="sportsbook" defaultValue={existing?.sportsbook ?? pick.sportsbook} /></Field>
            <Field label="Result" hint="Pending bets settle automatically with the pick.">
              <Select name="result" defaultValue={existing?.result ?? (pick.result === "pending" ? "pending" : pick.result)}>
                <option value="pending">Pending</option><option value="win">Win</option><option value="loss">Loss</option><option value="push">Push</option><option value="void">Void</option>
              </Select>
            </Field>
          </div>
          <Field label="Note (optional)"><Input name="note" defaultValue={existing?.note ?? ""} maxLength={500} /></Field>
          {state?.error && <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save to tracker"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
