import { NextResponse } from "next/server";
import { advanceActiveJobs } from "@/lib/hype/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Worker tick: advances every active job. Call from Vercel Cron, Supabase pg_cron, or any scheduler with CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await advanceActiveJobs(50_000);
  return NextResponse.json({ advanced: results });
}
