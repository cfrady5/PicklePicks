"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

const ACTIVE = new Set(["queued", "running", "waiting_provider"]);

/**
 * While a job is active, keeps it moving from the browser: polls the job and
 * asks the worker to advance it. This makes the pipeline responsive even on
 * hosts whose cron is infrequent (Vercel Hobby = once a day).
 */
export function LiveJob({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  React.useEffect(() => {
    if (!ACTIVE.has(status)) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        await fetch(`/api/hype/jobs/${id}/advance?budgetMs=12000`, { method: "POST" });
      } catch { /* ignore */ }
      if (!stopped) router.refresh();
    };
    const t = setInterval(tick, 6000);
    tick();
    return () => { stopped = true; clearInterval(t); };
  }, [id, status, router]);
  return null;
}
