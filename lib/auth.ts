import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env, isDemoMode } from "@/lib/env";
import { getRepo } from "@/lib/data";
import type { Entitlement, Profile } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export const DEMO_COOKIE = "pp_demo_user";

/** Current signed-in profile (or null). Cached per request. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const repo = getRepo();
  if (isDemoMode()) {
    const jar = await cookies();
    const id = jar.get(DEMO_COOKIE)?.value;
    if (!id) return null;
    return repo.getProfile(id);
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  let profile = await repo.getProfile(data.user.id);
  if (!profile) return null;
  // Bootstrap admin role from ADMIN_EMAILS on first sign-in.
  if (profile.role !== "admin" && env.adminEmails.includes(profile.email.toLowerCase())) {
    profile = await repo.updateProfile(profile.id, { role: "admin" });
  }
  return profile;
});

export const getEntitlement = cache(async (): Promise<Entitlement> => {
  const user = await getCurrentUser();
  if (!user) return { isSubscriber: false, isAdmin: false };
  const sub = await getRepo().getActiveSubscription(user.id);
  const isAdmin = user.role === "admin";
  return {
    isSubscriber: Boolean(sub) || isAdmin,
    isAdmin,
    planKey: sub?.planKey ?? (isAdmin ? "staff" : null),
    expiresAt: sub?.currentPeriodEnd ?? null,
    subscription: sub,
  };
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/dashboard?denied=admin");
  return user;
}

export function actorOf(user: Profile) {
  return { id: user.id, name: user.displayName };
}
