"use client";
import { useActionState } from "react";
import type { SiteContent, SubscriptionPlan } from "@/lib/data/types";
import { updateSiteContent, updatePlan, uploadPromo, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";

function Msg({ state }: { state: AdminState }) {
  if (state?.error) return <p role="alert" className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">Saved.</p>;
  return null;
}

export function SiteContentForm({ content }: { content: SiteContent }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(updateSiteContent, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Hero eyebrow"><Input name="heroEyebrow" defaultValue={content.heroEyebrow} required /></Field>
      <Field label="Headline" hint="Sentences separated by '. ' render on separate lines; the last one is highlighted."><Input name="heroHeadline" defaultValue={content.heroHeadline} required /></Field>
      <Field label="Subheadline"><Textarea name="heroSubheadline" defaultValue={content.heroSubheadline} required rows={3} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Primary CTA"><Input name="primaryCta" defaultValue={content.primaryCta} required /></Field><Field label="Secondary CTA"><Input name="secondaryCta" defaultValue={content.secondaryCta} required /></Field></div>
      <Field label="Announcement bar (optional)" hint="Shown under the hero. Keep it factual — no urgency tricks."><Input name="announcement" defaultValue={content.announcement ?? ""} /></Field>
      <Field label="Promo image URL (optional)"><Input name="promoImageUrl" defaultValue={content.promoImageUrl?.startsWith("data:") ? "" : content.promoImageUrl ?? ""} placeholder="https://…" /></Field>
      <Msg state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save homepage content"}</Button>
    </form>
  );
}

export function PromoUploadForm({ current }: { current?: string | null }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(uploadPromo, undefined);
  return (
    <form action={action} className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- may be a data: URL in demo mode */}
      {current && <img src={current} alt="Current promotional graphic" className="max-h-40 rounded-xl border border-border object-contain" />}
      <Field label="Upload promotional graphic" hint="PNG/JPG/WebP up to 5 MB. Stored in the 'promo' bucket (Supabase) or inline in demo mode."><Input name="file" type="file" accept="image/*" required /></Field>
      <Msg state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Uploading…" : "Upload"}</Button>
    </form>
  );
}

export function PlanForm({ plan }: { plan: SubscriptionPlan }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(updatePlan, undefined);
  return (
    <form action={action} className="card space-y-3 rounded-2xl p-5">
      <input type="hidden" name="key" value={plan.key} />
      <div className="flex items-center justify-between"><h3 className="font-display font-bold">{plan.name}</h3><code className="text-xs text-muted">{plan.key}</code></div>
      <div className="grid grid-cols-2 gap-3"><Field label="Name"><Input name="name" defaultValue={plan.name} required /></Field><Field label="Price (USD)"><Input name="price" type="number" step="0.01" min="0" defaultValue={(plan.priceCents / 100).toFixed(2)} required /></Field></div>
      <Field label="Tagline"><Input name="tagline" defaultValue={plan.tagline} /></Field>
      <Field label="Features (one per line)"><Textarea name="features" rows={5} defaultValue={plan.features.join("\n")} /></Field>
      <div className="flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="highlight" defaultChecked={plan.highlight} className="accent-[var(--brand)]" /> Highlight</label><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={plan.active} className="accent-[var(--brand)]" /> Active</label></div>
      <Msg state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>{pending ? "Saving…" : "Save plan"}</Button>
    </form>
  );
}
