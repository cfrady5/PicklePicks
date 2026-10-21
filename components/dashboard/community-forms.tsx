"use client";
import { useActionState, useEffect, useRef } from "react";
import { createThread, replyToThread, type ActionState } from "@/app/actions/member";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { SPORTS } from "@/lib/constants";

function Err({ state }: { state: ActionState }) {
  return state?.error ? <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p> : null;
}

export function NewThreadForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createThread, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Title"><Input name="title" required minLength={4} maxLength={120} /></Field>
      <Field label="Sport (optional)"><Select name="sport" defaultValue=""><option value="">General</option>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
      <Field label="Post"><Textarea name="body" required minLength={4} maxLength={4000} /></Field>
      <Err state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Posting…" : "Post thread"}</Button>
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(replyToThread, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <Textarea name="body" required minLength={2} maxLength={4000} placeholder="Add to the conversation…" />
      <Err state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Posting…" : "Reply"}</Button>
    </form>
  );
}
