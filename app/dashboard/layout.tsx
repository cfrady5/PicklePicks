import { requireUser, getEntitlement } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const repo = getRepo();
  const [ent, notifications, plans] = await Promise.all([getEntitlement(), repo.listNotifications(user.id), repo.listPlans()]);
  const unread = notifications.filter((n) => !n.readAt).length;
  const planLabel = ent.isAdmin ? "Staff" : ent.subscription ? plans.find((p) => p.key === ent.subscription!.planKey)?.name ?? ent.subscription.planKey : "Free account";
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardSidebar name={user.displayName} planLabel={planLabel} isAdmin={ent.isAdmin} unread={unread} demo={isDemoMode()} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
