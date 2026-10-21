import type { Metadata } from "next";
import { LegalDoc } from "@/components/layout/legal-doc";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="October 2026" sections={[
      ["What we collect", "Account information (email, display name, password hash held by our authentication provider), subscription and billing records (handled by our payment provider; we never store card numbers), notification preferences, bets you choose to log in your personal tracker, community posts, and standard technical data such as IP address and device information."],
      ["How we use it", "To provide and secure the Service, deliver picks and notifications you opt into, process payments, compute your personal tracker statistics, moderate the community, comply with legal obligations, and improve the product."],
      ["Who we share it with", "Service providers that run our infrastructure (hosting, database, authentication, email delivery, payments) under contract; authorities where required by law. We do not sell personal data."],
      ["Your choices", "You can update your profile and notification preferences, export or delete your tracked bets, cancel your subscription, and request deletion of your account from Account Settings or by contacting us."],
      ["Retention", "Account data is kept while your account is active and for a limited period afterwards to meet legal and accounting obligations. Historical pick records are retained indefinitely as they form the public performance ledger, but contain no personal data about members."],
      ["Cookies", "We use strictly necessary cookies for authentication and session management. We do not use third-party advertising cookies."],
      ["Children", "The Service is not directed to anyone under 21 and we do not knowingly collect data from minors."],
      ["Contact", "privacy@example.com. This document is a template and requires jurisdiction-specific legal review (including GDPR/CCPA applicability) before public launch."],
    ]} />
  );
}
