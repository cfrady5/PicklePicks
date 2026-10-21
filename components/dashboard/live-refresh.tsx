"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Real-time refresh: in Supabase mode, subscribes to pick changes and refreshes
 * server data. In demo mode, polls lightly so admin publish/settle actions show
 * up without a manual reload.
 */
export function LivePicksRefresher({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient();
      const channel = supabase.channel("picks-live").on("postgres_changes", { event: "*", schema: "public", table: "picks" }, () => router.refresh()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
