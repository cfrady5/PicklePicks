import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_SHORT } from "@/lib/constants";

const COLS = [
  { title: "Product", links: [["/results", "The Pickle's Record"], ["/pricing", "Pricing"], ["/how-it-works", "How It Works"], ["/dashboard", "Member Dashboard"]] },
  { title: "Company", links: [["/legal/terms", "Terms of Service"], ["/legal/privacy", "Privacy Policy"], ["/responsible-gambling", "Responsible Gambling"], ["/dashboard/settings", "In a Pickle? (Help)"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-2/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted">Big picks. Big personality. Real results — every one of them on the public ledger, wins and losses alike.</p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="text-sm text-text/80 transition hover:text-brand">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-2">
          <p>{DISCLAIMER_SHORT}</p>
          <p className="mt-2">
            Mr. Pickle&rsquo;s Picks is an information service and does not accept wagers, deposits, or place bets on anyone&rsquo;s behalf. If you or someone you know has a gambling problem, call <a className="text-muted underline" href="tel:1-800-522-4700">1-800-GAMBLER</a>.
          </p>
          <p className="mt-2">&copy; {new Date().getFullYear()} Mr. Pickle&rsquo;s Picks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
