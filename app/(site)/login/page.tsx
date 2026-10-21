import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { demoSignIn } from "@/app/actions/auth";
import { SignInForm } from "@/components/layout/auth-forms";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Login" };
export const dynamic = "force-dynamic";

const PERSONAS = [
  { id: "demo-member", label: "VIP member", desc: "Active VIP Pickle Jar subscription, tracked bets, notifications." },
  { id: "demo-free", label: "Free account", desc: "Signed in, no subscription — sees the paywall." },
  { id: "demo-admin", label: "Administrator", desc: "Full admin control center access." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getCurrentUser()) redirect(next ?? "/dashboard");
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="hidden lg:block">
        <Mascot size={360} className="mx-auto h-[360px] w-[360px]" />
        <h1 className="mt-6 text-center font-display text-3xl font-extrabold">Welcome back to the Pickle Jar.</h1>
        <p className="mt-2 text-center text-muted">Today&rsquo;s picks, your tracker and the full ledger are waiting.</p>
      </div>
      <div className="card rounded-3xl p-8">
        <h2 className="font-display text-2xl font-extrabold lg:hidden">Welcome back to the Pickle Jar.</h2>
        {error && <p role="alert" className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">Sign-in link was invalid or expired. Try again.</p>}
        {isDemoMode() ? (
          <div className="mt-2 space-y-4">
            <Badge variant="demo">Demo mode — pick a persona</Badge>
            <p className="text-sm text-muted">Supabase isn&rsquo;t configured, so there are no real accounts. Choose a sample persona to explore the member and admin experiences.</p>
            <div className="grid gap-3">
              {PERSONAS.map((p) => (
                <form key={p.id} action={demoSignIn}>
                  <input type="hidden" name="persona" value={p.id} />
                  <input type="hidden" name="next" value={next ?? ""} />
                  <Button type="submit" variant="secondary" className="h-auto w-full justify-start px-4 py-3 text-left">
                    <span><span className="block font-bold">{p.label}</span><span className="block text-xs font-normal text-muted">{p.desc}</span></span>
                  </Button>
                </form>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6"><SignInForm next={next} /></div>
        )}
      </div>
    </div>
  );
}
