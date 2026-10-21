"use client";
import { useActionState } from "react";
import type { Profile } from "@/lib/data/types";
import { updateProfile, type ActionState } from "@/app/actions/member";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function ProfileForm({ user }: { user: Profile }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Display name"><Input name="displayName" defaultValue={user.displayName} required minLength={2} maxLength={40} /></Field>
      <Field label="Jurisdiction (state / country)" hint="Used only to check availability."><Input name="jurisdiction" defaultValue={user.jurisdiction ?? ""} placeholder="e.g. New Jersey, USA" /></Field>
      {!user.ageVerifiedAt && <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="ageConfirm" className="mt-1 accent-[var(--brand)]" /> I confirm I am of legal age for sports-betting information in my jurisdiction.</label>}
      {state?.error && <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Saved.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
