"use client";
import { useActionState, useEffect, useRef } from "react";
import { addMemeReference, type HypeActionState } from "@/app/actions/hype";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea } from "@/components/ui/input";

export function ReferenceForm() {
  const [state, action, pending] = useActionState<HypeActionState, FormData>(addMemeReference, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Field label="Title"><Input name="title" required placeholder="Mascot walkout — tunnel" /></Field>
      <Field label="Video URL (https, 9:16 MP4)"><Input name="videoUrl" type="url" required placeholder="https://…/clip.mp4" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (s)"><Input name="durationSec" type="number" min={1} max={15} defaultValue={8} required /></Field>
        <Field label="Mood"><Input name="mood" placeholder="swagger / dominant / cold / electric" /></Field>
      </div>
      <Field label="Tags (comma separated)" hint="e.g. walkout, confident, celebration, under, prop"><Input name="tags" /></Field>
      <Field label="Sports (comma separated)" hint="NBA, NFL, MLB, NHL, NCAAB, NCAAF — blank = any"><Input name="sports" /></Field>
      <Field label="License note (required)" hint="Who granted reuse rights and under what terms. Only add clips you are licensed to reuse."><Textarea name="licenseNote" rows={2} required /></Field>
      <Field label="Source"><Input name="source" placeholder="Shot in-house / licensed from … / CC-BY by …" /></Field>
      {state?.error && <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Added to the library.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Add reference clip"}</Button>
    </form>
  );
}
