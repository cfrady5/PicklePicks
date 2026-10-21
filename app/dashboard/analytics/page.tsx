import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { DashTitle } from "@/components/dashboard/page-title";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export const metadata: Metadata = { title: "Performance Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser("/dashboard/analytics");
  const repo = getRepo();
  const [picks, tracked] = await Promise.all([repo.listPublicPicks(), repo.listTrackedBets(user.id)]);
  return (
    <>
      <DashTitle eyebrow="Winning amounts & analytics" title="Performance analytics" subtitle="Two very different numbers, kept separate on purpose: what you actually bet, and what the service's picks would hypothetically have returned." />
      <AnalyticsView picks={picks} tracked={tracked} />
    </>
  );
}
