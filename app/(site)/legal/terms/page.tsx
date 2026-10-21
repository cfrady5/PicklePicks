import type { Metadata } from "next";
import { LegalDoc } from "@/components/layout/legal-doc";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="October 2026" sections={[
      ["1. The service", "Mr. Pickle's Picks (\"the Service\") provides sports betting opinions, analysis and historical performance reporting for informational and entertainment purposes only. The Service does not accept wagers, hold funds, or place bets on your behalf, and is not a sportsbook, bookmaker, or financial adviser."],
      ["2. No guarantees", "Sports outcomes are uncertain. Nothing on the Service is a promise, guarantee or prediction of winnings. Past performance, including any published win rate, net units or ROI, does not guarantee future results. You are solely responsible for any wagering decisions you make and for any losses you incur."],
      ["3. Eligibility", "You must be at least 21 years old (or the legal age for sports wagering information in your jurisdiction, whichever is higher) and located where accessing such information is lawful. We may restrict access by jurisdiction and may ask you to confirm your age and location."],
      ["4. Accounts", "You are responsible for maintaining the confidentiality of your login and for all activity under your account. Sharing premium picks or redistributing paid content is prohibited and may result in termination without refund."],
      ["5. Subscriptions, renewals and cancellation", "Paid plans grant access for the stated period. Weekly and monthly plans renew automatically at the then-current price until canceled. The Daily plan is a one-time pass and does not renew. You may cancel at any time from your dashboard; access continues until the end of the paid period. Except where required by law, fees are non-refundable. Prices may change with notice; changes apply to subsequent renewals."],
      ["6. Performance reporting", "Published picks are frozen at publication and recorded with a timestamp. Settlements are recorded with the settling administrator and time. Corrections are logged with a reason and the prior settlement remains visible. Results are computed from these records and reported in units; the odds you obtain may differ from those recorded."],
      ["7. Community conduct", "Community areas are moderated. Harassment, spam, tout promotion, solicitation of wagers, and sharing of illegal content are prohibited. We may remove content and suspend accounts at our discretion."],
      ["8. Intellectual property", "All content on the Service, including picks, analysis, branding and the Mr. Pickle mascot, is owned by us or our licensors and may not be reproduced without permission."],
      ["9. Disclaimer and limitation of liability", "The Service is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental or consequential damages, or for any wagering losses, arising from use of the Service. Our total liability is limited to the fees you paid in the 3 months preceding the claim."],
      ["10. Changes", "We may update these Terms. Material changes will be announced on the Service, and continued use after the effective date constitutes acceptance."],
      ["11. Contact", "Questions about these Terms: legal@example.com. This document is a template and must be reviewed by qualified counsel for each jurisdiction in which the Service is offered before public launch."],
    ]} />
  );
}
