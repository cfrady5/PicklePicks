import { DashTitle } from "@/components/dashboard/page-title";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { emailConfigured } from "@/lib/email";
import { Badge } from "@/components/ui/badge";

export default function AdminNotificationsPage() {
  return (
    <>
      <DashTitle eyebrow="Reach members" title="Send a notification" subtitle="New-pick and settlement alerts are sent automatically. Use this for announcements."><Badge variant={emailConfigured() ? "win" : "demo"}>{emailConfigured() ? "Email: Resend connected" : "Email: not configured (in-app only)"}</Badge></DashTitle>
      <div className="card max-w-2xl rounded-2xl p-6"><BroadcastForm /></div>
    </>
  );
}
