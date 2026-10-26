import { NextResponse, after } from "next/server";
import { z } from "zod";
import { authorizeHypeRequest } from "@/lib/hype/auth";
import { startHypeForPick, advanceJob } from "@/lib/hype/pipeline";
import { getHypeStore } from "@/lib/hype/store";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** POST { pickId, capUsd? } → creates the job and advances it in the background. */
export async function POST(request: Request) {
  const auth = await authorizeHypeRequest(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  const parsed = z.object({ pickId: z.string().min(1), capUsd: z.coerce.number().positive().max(100).optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const job = await startHypeForPick(parsed.data.pickId, auth.actorId, { capUsd: parsed.data.capUsd });
    after(async () => { try { await advanceJob(job.id, { budgetMs: 240_000 }); } catch (e) { console.error("[hype] background advance failed", e); } });
    return NextResponse.json({ job }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = await authorizeHypeRequest(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  const url = new URL(request.url);
  const jobs = await getHypeStore().listJobs({ pickId: url.searchParams.get("pickId") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 50) });
  return NextResponse.json({ jobs });
}
