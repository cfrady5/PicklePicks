"use client";
import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, sendMagicLink, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

function Msg({ state }: { state: AuthState }) {
  if (!state?.error && !state?.message) return null;
  return <p role="alert" className={`rounded-lg border px-3 py-2 text-sm ${state.error ? "border-loss/40 bg-loss/10 text-loss" : "border-brand/40 bg-brand/10 text-brand"}`}>{state.error ?? state.message}</p>;
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, undefined);
  const [magic, magicAction, magicPending] = useActionState<AuthState, FormData>(sendMagicLink, undefined);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Msg state={state} />
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      <div className="relative text-center text-xs text-muted"><span className="bg-card px-2">or</span><div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" /></div>
      <form action={magicAction} className="space-y-3">
        <Field label="Email me a magic link"><Input name="email" type="email" required placeholder="you@example.com" /></Field>
        <Msg state={magic} />
        <Button type="submit" variant="secondary" className="w-full" disabled={magicPending}>{magicPending ? "Sending…" : "Send magic link"}</Button>
      </form>
      <p className="text-center text-sm text-muted">New here? <Link href="/signup" className="font-semibold text-brand">Create an account</Link></p>
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Display name"><Input name="displayName" required minLength={2} /></Field>
      <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" hint="At least 8 characters."><Input name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>
      <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="ageConfirm" className="mt-1 accent-[var(--brand)]" required /> I confirm I am of legal age to view sports betting information in my jurisdiction (21+ in most U.S. states).</label>
      <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" name="termsAccept" className="mt-1 accent-[var(--brand)]" required /> I agree to the <Link href="/legal/terms" className="text-brand underline">Terms</Link> and <Link href="/legal/privacy" className="text-brand underline">Privacy Policy</Link>, and understand picks are information only with no guaranteed outcome.</label>
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-muted">Already in the jar? <Link href="/login" className="font-semibold text-brand">Sign in</Link></p>
    </form>
  );
}
