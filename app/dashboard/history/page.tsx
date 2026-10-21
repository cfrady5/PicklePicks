import type { Metadata } from "next";
import { getRepo } from "@/lib/data";
import { getEntitlement } from "@/lib/auth";
import { computeStats } from "@/lib/stats";
import { DashTitle } from "@/components/dashboard/page-title";
import { PicksTable } from "@/components/results/picks-table";
import { StatsGrid } from "@/components/results/stats-grid";

export const metadata: Metadata = { title: "Pick History" };

export default async function HistoryPage() {
  const ent = await getEntitlement();
  const picks = await getRepo().listPublicPicks();
  // Non-subscribers never see pending premium selections, even in history.
  const visible = ent.isSubscriber ? picks : picks.filter((p) => p.result !== "pending");
  const stats = computeStats(picks);
  return (
    <>
      <DashTitle eyebrow="The Pickle's Record" title="Pick history" subtitle="Every published pick with its frozen selection, odds and stake. Click a row for the publication snapshot and audit trail." />
      <StatsGrid stats={stats} className="mb-6" />
      <PicksTable picks={visible} showPending={ent.isSubscriber} />
    </>
  );
}
