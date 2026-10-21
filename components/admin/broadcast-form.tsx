"use client";
import { useActionState } from "react";
import { broadcast, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";

export function BroadcastForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(broadcast, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Audience"><Select name="audience" defaultValue="subscribers"><option value="subscribers">Active subscribers</option><option value="all">All accounts</option></Select></Field>
        <Field label="Type"><Select name="type" defaultValue="system"><option value="system">Announcement</option><option value="new_pick">New picks</option><option value="upcoming_game">Upcoming game</option><option value="settled">Results</option><option value="renewal">Renewal</option></Select></Field>
      </div>
      <Field label="Title"><Input name="title" required maxLength={100} /></Field>
      <Field label="Message"><Textarea name="body" required maxLength={500} rows={4} /></Field>
      <Field label="Link (optional)"><Input name="href" placeholder="/dashboard/picks" /></Field>
      {state?.error && <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Sent to {state.id} member{state.id === "1" ? "" : "s"}.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send notification"}</Button>
      <p className="text-xs text-muted-2">Creates in-app notifications. Email delivery honors each member&rsquo;s preferences and requires RESEND_API_KEY.</p>
    </form>
  );
}
