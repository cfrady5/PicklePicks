import { NextResponse } from "next/server";
import { authorizeHypeRequest } from "@/lib/hype/auth";
import { getHypeStore } from "@/lib/hype/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeHypeRequest(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  const job = await getHypeStore().getJob((await params).id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ job });
}
