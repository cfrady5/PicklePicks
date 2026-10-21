import { Resend } from "resend";
import { env } from "@/lib/env";

let resend: Resend | null = null;

export function emailConfigured() {
  return Boolean(env.resendApiKey);
}

export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }) {
  if (!env.resendApiKey) {
    console.info(`[email:skipped] to=${input.to} subject="${input.subject}" (RESEND_API_KEY not set)`);
    return { skipped: true };
  }
  if (!resend) resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({ from: env.emailFrom, to: input.to, subject: input.subject, html: input.html, text: input.text });
  if (error) throw new Error(error.message);
  return { skipped: false };
}

const shell = (title: string, body: string, cta?: { label: string; href: string }) => `
<!doctype html><html><body style="margin:0;background:#080d0a;font-family:Inter,Arial,sans-serif;color:#f7fff4">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:800;font-size:20px;color:#8dff32;letter-spacing:-0.02em">Mr. Pickle's Picks</div>
    <h1 style="font-size:24px;margin:24px 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#d7e3da">${body}</div>
    ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#8dff32;color:#080d0a;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">${cta.label}</a>` : ""}
    <p style="margin-top:32px;font-size:12px;color:#94a69a">Sports picks are informational content only. No outcome is guaranteed. Past performance does not guarantee future results. Please gamble responsibly. You can manage notification preferences from your dashboard.</p>
  </div>
</body></html>`;

export const templates = {
  newPick: (opts: { sport: string; selection: string; odds: string }) => ({
    subject: `Fresh pick in the jar: ${opts.sport} — ${opts.selection}`,
    html: shell("Fresh Picks are in the jar", `<p><strong>${opts.sport}</strong> · ${opts.selection} · ${opts.odds}</p><p>Full analysis and sizing are on your dashboard.</p>`, { label: "View today's picks", href: `${env.siteUrl}/dashboard/picks` }),
  }),
  settled: (opts: { selection: string; result: string; net: string }) => ({
    subject: `Pick settled: ${opts.result.toUpperCase()} — ${opts.selection}`,
    html: shell(`Settled: ${opts.result.toUpperCase()}`, `<p>${opts.selection}</p><p>Net units: <strong>${opts.net}</strong></p>`, { label: "See the ledger", href: `${env.siteUrl}/dashboard/history` }),
  }),
  renewal: (opts: { plan: string; date: string }) => ({
    subject: `Your ${opts.plan} renews on ${opts.date}`,
    html: shell("Upcoming renewal", `<p>Your <strong>${opts.plan}</strong> membership renews automatically on ${opts.date}. You can cancel anytime before then from your subscription page.</p>`, { label: "Manage subscription", href: `${env.siteUrl}/dashboard/subscription` }),
  }),
  welcome: (opts: { name: string }) => ({
    subject: "Welcome to the Pickle Jar",
    html: shell(`Welcome to the Pickle Jar, ${opts.name}`, `<p>Your account is ready. Head to the dashboard to see today's picks and the full, unfiltered results ledger.</p>`, { label: "Open dashboard", href: `${env.siteUrl}/dashboard` }),
  }),
};
