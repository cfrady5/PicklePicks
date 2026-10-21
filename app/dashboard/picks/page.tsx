import type { Metadata } from "next";
import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { DashTitle } from "@/components/dashboard/page-title";
import { PickCard } from "@/components/picks/pick-card";
import { Paywall } from "@/components/picks/paywall";
import { TrackBetButton } from "@/components/dashboard/track-bet-dialog";
import { BRAND_COPY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { LivePicksRefresher } from "@/components/dashboard/live-refresh";

export const metadata: Metadata = { title: "Today's Picks" };

export default async function TodaysPicksPage() {
  const user = await requireUser("/dashboard/picks");
  const repo = getRepo();
  const [ent, picks, tracked] = await Promise.all([getEntitlement(), repo.listTodaysPicks(), repo.listTrackedBets(user.id)]);
  const pending = picks.filter((p) => p.result === "pending");
  const settled = picks.filter((p) => p.result !== "pending");
  const trackedIds = new Set(tracked.map((t) => t.pickId));

  return (
    <>
      <LivePicksRefresher />
      <DashTitle eyebrow={BRAND_COPY.freshPicks} title="Today's premium picks" subtitle="Published with odds, recommended unit sizing, confidence tier and the full written read. Mark the ones you tail in your tracker.">
        <Badge variant="pending">{pending.length} pending · {settled.length} settled today</Badge>
      </DashTitle>
      {!ent.isSubscriber ? (
        <Paywall count={pending.length} />
      ) : picks.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center text-muted">No picks for today yet. You&rsquo;ll get a notification when fresh picks drop.</div>
      ) : (
        <div className="space-y-4">
          {[...pending, ...settled].map((p) => (
            <PickCard key={p.id} pick={p} defaultOpen={p.result === "pending"} action={<TrackBetButton pick={p} tracked={trackedIds.has(p.id)} />} />
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-muted-2">Confidence tiers describe recommended sizing from our process. They are not win probabilities, and nothing here is a guarantee. Bet responsibly.</p>
    </>
  );
}
