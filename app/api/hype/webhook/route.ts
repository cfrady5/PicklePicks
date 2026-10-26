import { NextResponse, after } from "next/server";
import { HYPE_SETTINGS, advanceJob, findJobByProviderRequest } from "@/lib/hype/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Higgsfield completion webhook. The secret we passed at submit time comes back as X-Webhook-Secret-Key. */
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret-key") ?? "";
  if (!HYPE_SETTINGS.webhookSecret || secret !== HYPE_SETTINGS.webhookSecret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; job_set_id?: string; request_id?: string };
  const requestId = body.id ?? body.job_set_id ?? body.request_id;
  if (!requestId) return NextResponse.json({ ok: true, ignored: "no id" });
  const job = await findJobByProviderRequest(requestId);
  if (!job) return NextResponse.json({ ok: true, ignored: "unknown request" });
  after(async () => { try { await advanceJob(job.id, { budgetMs: 240_000 }); } catch (e) { console.error("[hype] webhook advance failed", e); } });
  return NextResponse.json({ ok: true, jobId: job.id });
}
