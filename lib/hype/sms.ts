import type { HypeDelivery } from "./types";

export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID) && process.env.HYPE_ALERT_PHONE);
}

/**
 * Sends the result to the operator's phone. The cover goes as MMS media
 * (image/jpeg, kept under Twilio's 5 MB limit); the MP4 goes as a link in the
 * body, since MMS video support is carrier-dependent and size-capped.
 * Without Twilio credentials this is a dry run that only logs.
 */
export async function sendResultText(input: { body: string; mediaUrls: string[] }): Promise<HypeDelivery> {
  const to = process.env.HYPE_ALERT_PHONE ?? "";
  const sentAt = new Date().toISOString();
  if (!twilioConfigured()) {
    console.info(`[hype:sms:dry-run] to=${to || "(unset)"} media=${input.mediaUrls.join(",")}\n${input.body}`);
    return { mode: "dry_run", to, body: input.body, mediaUrls: input.mediaUrls, sentAt };
  }
  const { default: twilio } = await import("twilio");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const msg = await client.messages.create({
    to,
    ...(process.env.TWILIO_MESSAGING_SERVICE_SID ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID } : { from: process.env.TWILIO_FROM! }),
    body: input.body,
    ...(input.mediaUrls.length ? { mediaUrl: input.mediaUrls.filter((u) => u.startsWith("https://")) } : {}),
  });
  return { mode: "twilio", to, body: input.body, mediaUrls: input.mediaUrls, sid: msg.sid, sentAt };
}
