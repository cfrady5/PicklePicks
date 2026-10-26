import { getCurrentUser } from "@/lib/auth";

/** Admin session OR a bearer HYPE_API_KEY (for external triggers / automations). */
export async function authorizeHypeRequest(request: Request): Promise<{ ok: true; actorId: string } | { ok: false; status: number }> {
  const auth = request.headers.get("authorization") ?? "";
  const key = process.env.HYPE_API_KEY;
  if (key && auth === `Bearer ${key}`) return { ok: true, actorId: "api-key" };
  const user = await getCurrentUser();
  if (user?.role === "admin") return { ok: true, actorId: user.id };
  return { ok: false, status: user ? 403 : 401 };
}
