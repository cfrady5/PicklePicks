import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { moderatePost } from "@/app/actions/member";
import { ReplyForm } from "@/components/dashboard/community-forms";
import { SportBadge } from "@/components/picks/sport-badge";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, cn } from "@/lib/utils";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/community/${id}`);
  const ent = await getEntitlement();
  if (!ent.isSubscriber) notFound();
  const data = await getRepo().getThread(id);
  if (!data) notFound();
  const { thread, posts } = data;
  const visible = posts.filter((p) => !p.hidden || ent.isAdmin);
  return (
    <>
      <Link href="/dashboard/community" className="text-xs font-semibold text-muted hover:text-text">← All threads</Link>
      <article className="card mt-3 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-xs text-muted">{thread.sport && <SportBadge sport={thread.sport} />}<span>{thread.authorName}</span><span>·</span><span>{formatDateTime(thread.createdAt)}</span>{thread.pinned && <Badge variant="brand">Pinned</Badge>}{thread.locked && <Badge>Locked</Badge>}</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{thread.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text/90">{thread.body}</p>
      </article>
      <section className="mt-6 space-y-3">
        {visible.map((p) => (
          <div key={p.id} className={cn("card rounded-xl p-4", p.hidden && "opacity-60")}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span><span className="font-semibold text-text">{p.authorName}</span> · {formatDateTime(p.createdAt)} {p.hidden && <Badge variant="loss" className="ml-2">Hidden</Badge>}</span>
              {ent.isAdmin && (
                <form action={moderatePost}><input type="hidden" name="postId" value={p.id} /><input type="hidden" name="threadId" value={thread.id} /><input type="hidden" name="hidden" value={String(!p.hidden)} /><button type="submit" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/5 hover:text-text">{p.hidden ? <><Eye className="h-3.5 w-3.5" /> Unhide</> : <><EyeOff className="h-3.5 w-3.5" /> Hide</>}</button></form>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
          </div>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted">No replies yet.</p>}
      </section>
      <section className="card mt-6 rounded-2xl p-5">
        <h2 className="font-display text-base font-bold">Reply as {user.displayName}</h2>
        {thread.locked ? <p className="mt-2 text-sm text-muted">This thread is locked.</p> : <div className="mt-3"><ReplyForm threadId={thread.id} /></div>}
      </section>
    </>
  );
}
