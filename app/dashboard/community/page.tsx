import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Pin, Lock } from "lucide-react";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { DashTitle } from "@/components/dashboard/page-title";
import { NewThreadForm } from "@/components/dashboard/community-forms";
import { Paywall } from "@/components/picks/paywall";
import { SportBadge } from "@/components/picks/sport-badge";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pickle Jar Community" };

export default async function CommunityPage() {
  await requireUser("/dashboard/community");
  const ent = await getEntitlement();
  if (!ent.isSubscriber) return (<><DashTitle eyebrow="Members only" title="Pickle Jar Community" subtitle="Game-day threads and discussion for active members." /><Paywall count={0} compact /></>);
  const threads = await getRepo().listThreads();
  return (
    <>
      <DashTitle eyebrow="Members only" title="Pickle Jar Community" subtitle="Game-day conversation, moderated. Be sharp, be kind, no touting." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/dashboard/community/${t.id}`} className="card block rounded-xl p-4 transition hover:border-brand/40">
                <div className="flex items-center gap-2 text-xs text-muted">{t.pinned && <Pin className="h-3.5 w-3.5 text-brand" />}{t.locked && <Lock className="h-3.5 w-3.5" />}{t.sport && <SportBadge sport={t.sport} />}<span>{t.authorName}</span><span>·</span><span>{formatDateTime(t.createdAt)}</span></div>
                <h3 className="mt-1 font-display text-base font-bold">{t.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{t.body}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted"><MessageSquare className="h-3.5 w-3.5" /> {t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"}</div>
              </Link>
            </li>
          ))}
          {threads.length === 0 && <li className="card rounded-xl p-8 text-center text-sm text-muted">No threads yet. Start the first one.</li>}
        </ul>
        <aside className="card h-fit rounded-2xl p-5"><h2 className="font-display text-base font-bold">Start a thread</h2><div className="mt-3"><NewThreadForm /></div></aside>
      </div>
    </>
  );
}
