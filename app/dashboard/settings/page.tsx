import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { DashTitle } from "@/components/dashboard/page-title";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PickleIcon } from "@/components/brand/pickle-icon";

export const metadata: Metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  return (
    <>
      <DashTitle eyebrow="In a Pickle?" title="Account settings" subtitle="Profile, eligibility and support." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card rounded-2xl p-6">
          <h2 className="font-display text-base font-bold">Profile</h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted"><span>{user.email}</span><Badge variant={user.role === "admin" ? "brand" : "outline"}>{user.role}</Badge></div>
          <div className="mt-5"><ProfileForm user={user} /></div>
        </section>
        <div className="space-y-6">
          <section className="card rounded-2xl p-6">
            <h2 className="font-display text-base font-bold">Eligibility</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Age confirmed</dt><dd className="font-semibold">{user.ageVerifiedAt ? formatDate(user.ageVerifiedAt) : "Not yet"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Jurisdiction</dt><dd className="font-semibold">{user.jurisdiction || "Not set"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Member since</dt><dd className="font-semibold">{formatDate(user.createdAt)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-2">Access may be restricted in jurisdictions where paid sports-betting information is not permitted.</p>
          </section>
          <section className="card rounded-2xl border-brand/30 p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold"><PickleIcon className="text-brand" /> In a Pickle? Get help</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Billing or access issues: <a href="mailto:support@example.com" className="text-brand underline">support@example.com</a></li>
              <li>Request account deletion or data export: <a href="mailto:privacy@example.com" className="text-brand underline">privacy@example.com</a></li>
              <li>Gambling concerns: <a href="tel:1-800-426-2537" className="text-brand underline">1-800-GAMBLER</a> (free, confidential, 24/7)</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
