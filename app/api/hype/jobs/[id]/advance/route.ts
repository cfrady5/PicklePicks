import { NextResponse } from "next/server";
import { authorizeHypeRequest } from "@/lib/hype/auth";
import { advanceJob } from "@/lib/hype/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeHypeRequest(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  const url = new URL(request.url);
  const budgetMs = Math.min(240_000, Math.max(5_000, Number(url.searchParams.get("budgetMs") ?? 40_000)));
  try {
    const job = await advanceJob((await params).id, { budgetMs });
    return NextResponse.json({ job });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
