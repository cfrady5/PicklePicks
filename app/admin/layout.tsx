import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { AdminSidebar } from "@/components/admin/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar name={admin.displayName} demo={isDemoMode()} />
      <main className="min-w-0 flex-1"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div></main>
    </div>
  );
}
