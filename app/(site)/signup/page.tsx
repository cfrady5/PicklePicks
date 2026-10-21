import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { SignUpForm } from "@/components/layout/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="card rounded-3xl p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Welcome to the Pickle Jar</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Free to join. Premium picks require a subscription; the results ledger is always public.</p>
        <div className="mt-6">
          {isDemoMode() ? (
            <div className="space-y-3 text-sm text-muted">
              <p>Account creation needs Supabase. In demo mode, use a sample persona instead.</p>
              <Button asChild className="w-full"><Link href="/login">Choose a demo persona</Link></Button>
            </div>
          ) : (
            <SignUpForm />
          )}
        </div>
      </div>
    </div>
  );
}
