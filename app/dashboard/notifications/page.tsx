import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { markAllRead, updatePreferences } from "@/app/actions/member";
import { DashTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const PREFS = [
  { key: "newPicks", label: "Newly published picks", desc: "Email as soon as fresh picks hit the jar." },
  { key: "upcomingGames", label: "Upcoming games", desc: "A reminder about an hour before a pick's game starts." },
  { key: "settledResults", label: "Settled results", desc: "Nightly summary when picks are graded." },
  { key: "renewals", label: "Subscription renewals", desc: "Heads-up before your plan renews. (Always sent for billing changes required by law.)" },
] as const;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await requireUser("/dashboard/notifications");
  const repo = getRepo();
  const [list, prefs] = await Promise.all([repo.listNotifications(user.id), repo.getNotificationPreferences(user.id)]);
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <>
      <DashTitle eyebrow="Stay in the loop" title="Notifications" subtitle="In-app feed plus email preferences. Push notifications are coming later.">
        {unread > 0 && <form action={markAllRead}><Button variant="secondary" size="sm" type="submit"><CheckCheck className="h-4 w-4" /> Mark all read</Button></form>}
      </DashTitle>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <ul className="space-y-2">
            {list.map((n) => (
              <li key={n.id} className={cn("card flex gap-3 rounded-xl p-4", !n.readAt && "border-brand/30")}>
                <div className={cn("mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", n.readAt ? "bg-white/5 text-muted" : "bg-brand/15 text-brand")}><Bell className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{n.title}</span><span className="shrink-0 text-xs text-muted">{formatDateTime(n.createdAt)}</span></div>
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                  {n.href && <Link href={n.href} className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">Open →</Link>}
                </div>
              </li>
            ))}
            {list.length === 0 && <li className="card rounded-xl p-10 text-center text-sm text-muted">No notifications yet.</li>}
          </ul>
        </section>
        <aside className="card h-fit rounded-2xl p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold">Email preferences</h2>{!emailConfigured() && <Badge variant="demo">Email not configured</Badge>}</div>
          <p className="mt-1 text-xs text-muted-2">Sent to {prefs.email ?? user.email}.</p>
          {saved && <p className="mt-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand">Preferences saved.</p>}
          <form action={updatePreferences} className="mt-4 space-y-4">
            {PREFS.map((p) => (
              <label key={p.key} className="flex items-start justify-between gap-3">
                <span><span className="block text-sm font-semibold">{p.label}</span><span className="block text-xs text-muted">{p.desc}</span></span>
                <Switch name={p.key} defaultChecked={prefs[p.key]} />
              </label>
            ))}
            <label className="flex items-start justify-between gap-3 border-t border-border pt-4 opacity-70">
              <span><span className="block text-sm font-semibold">Push notifications</span><span className="block text-xs text-muted">Coming later. Toggle now to be enrolled when available.</span></span>
              <Switch name="pushEnabled" defaultChecked={prefs.pushEnabled} />
            </label>
            <Button type="submit" className="w-full" variant="secondary">Save preferences</Button>
          </form>
        </aside>
      </div>
    </>
  );
}
