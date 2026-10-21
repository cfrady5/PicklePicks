import type { Metadata } from "next";
import { LegalDoc } from "@/components/layout/legal-doc";

export const metadata: Metadata = { title: "Responsible Gambling" };

export default function ResponsibleGamblingPage() {
  return (
    <LegalDoc title="Responsible Gambling" updated="October 2026" intro="Sports betting should be entertainment, never a way to make money you need. Our own record shows losing weeks and drawdowns — that is normal, and it is exactly why you should only ever bet what you can afford to lose." sections={[
      ["Ground rules we recommend", "Set a bankroll you can lose without consequence and size every bet as a small fraction of it (a 'unit'). Never chase losses. Never bet with borrowed money. Take breaks. Treat any pick — ours included — as an opinion, not a certainty."],
      ["Warning signs", "Betting more than you planned, borrowing to bet, hiding betting from people close to you, feeling restless or irritable when not betting, or betting to escape problems. If any of these sound familiar, please reach out to the resources below."],
      ["Get help (U.S.)", "National Problem Gambling Helpline: call or text 1-800-GAMBLER (1-800-426-2537), chat at ncpgambling.org/chat — free, confidential, 24/7. Gamblers Anonymous: gamblersanonymous.org."],
      ["Get help (elsewhere)", "UK: GamCare 0808 8020 133 (gamcare.org.uk). Canada: ConnexOntario 1-866-531-2600. Australia: Gambling Help Online 1800 858 858. Other regions: search for your national problem-gambling helpline."],
      ["Self-exclusion", "Most licensed sportsbooks and many states offer voluntary self-exclusion programs and deposit limits. If you want to stop receiving our picks and notifications, cancel your subscription from your dashboard or contact support and we will close your account."],
      ["Age and jurisdiction", "You must be of legal age (21+ in most U.S. states) and located where sports-betting information is lawful. The Service may be unavailable in restricted jurisdictions."],
    ]} />
  );
}
