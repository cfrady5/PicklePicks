"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode, env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/auth";
import { sendEmail, templates } from "@/lib/email";

export type AuthState = { error?: string; message?: string } | undefined;

const credentials = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function demoSignIn(formData: FormData) {
  if (!isDemoMode()) redirect("/login");
  const persona = String(formData.get("persona") ?? "demo-member");
  const allowed = ["demo-admin", "demo-member", "demo-free"];
  if (!allowed.includes(persona)) redirect("/login");
  const jar = await cookies();
  jar.set(DEMO_COOKIE, persona, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(safeNext(formData.get("next")));
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ displayName: z.string().min(2, "Tell us what to call you"), ageConfirm: z.literal("on", { message: "You must confirm you meet the age requirement" }), termsAccept: z.literal("on", { message: "You must accept the Terms of Service" }) })
    .safeParse({ email: formData.get("email"), password: formData.get("password"), displayName: formData.get("displayName"), ageConfirm: formData.get("ageConfirm"), termsAccept: formData.get("termsAccept") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName, age_confirmed_at: new Date().toISOString() }, emailRedirectTo: `${env.siteUrl}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.user && !data.session) return { message: "Check your inbox — we sent a confirmation link." };
  try { await sendEmail({ to: parsed.data.email, ...templates.welcome({ name: parsed.data.displayName }) }); } catch { /* non-blocking */ }
  redirect("/dashboard");
}

export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: `${env.siteUrl}/auth/callback` } });
  if (error) return { error: error.message };
  return { message: "Magic link sent. Check your inbox." };
}
