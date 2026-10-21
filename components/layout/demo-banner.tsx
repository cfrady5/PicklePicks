import { isDemoMode } from "@/lib/env";
import { PickleIcon } from "@/components/brand/pickle-icon";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="border-b border-pending/30 bg-pending/10 text-pending">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-xs font-semibold sm:px-6">
        <PickleIcon className="h-3.5 w-3.5" />
        <span>
          <span className="uppercase tracking-wider">Demo mode</span> — all picks, results and stats shown are clearly labeled sample data generated for development. Configure Supabase to use real records.
        </span>
      </div>
    </div>
  );
}
