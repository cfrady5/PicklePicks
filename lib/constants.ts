export const SITE_NAME = "Mr. Pickle's Picks";
export const SITE_TAGLINE = "Big picks. Big personality. Real results.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SPORTS = [
  { key: "NBA", label: "NBA", emoji: "🏀", league: "National Basketball Association" },
  { key: "NFL", label: "NFL", emoji: "🏈", league: "National Football League" },
  { key: "MLB", label: "MLB", emoji: "⚾", league: "Major League Baseball" },
  { key: "NHL", label: "NHL", emoji: "🏒", league: "National Hockey League" },
  { key: "NCAAB", label: "College Basketball", emoji: "🏀", league: "NCAA Basketball" },
  { key: "NCAAF", label: "College Football", emoji: "🏈", league: "NCAA Football" },
  { key: "OTHER", label: "Other Sports", emoji: "🏆", league: "Other" },
] as const;

export type SportKey = (typeof SPORTS)[number]["key"];

export const BET_TYPES = [
  { key: "spread", label: "Spread" },
  { key: "moneyline", label: "Moneyline" },
  { key: "total", label: "Total" },
  { key: "player_prop", label: "Player Prop" },
  { key: "team_prop", label: "Team Prop" },
  { key: "parlay", label: "Parlay" },
] as const;

export type BetTypeKey = (typeof BET_TYPES)[number]["key"];

export const UNIT_SIZES = [5, 10, 25, 50, 100] as const;

/**
 * Placeholder prices — editable in the admin content panel and NOT final
 * business decisions. Billing is disabled until the payment provider has
 * explicitly approved the paid sports-picks business category.
 */
export const DEFAULT_PLANS = [
  {
    key: "daily",
    name: "Daily Pickle",
    priceCents: 999,
    interval: "day" as const,
    intervalCount: 1,
    tagline: "24 hours in the jar.",
    features: ["24-hour access to premium picks", "Full pick analysis", "Access to member dashboard"],
    highlight: false,
  },
  {
    key: "weekly",
    name: "Weekly Pickle",
    priceCents: 2999,
    interval: "week" as const,
    intervalCount: 1,
    tagline: "A full week of fresh picks.",
    features: ["Seven days of premium picks", "Full pick analysis", "Dashboard access", "Pick notifications"],
    highlight: false,
  },
  {
    key: "vip",
    name: "VIP Pickle Jar",
    priceCents: 7999,
    interval: "month" as const,
    intervalCount: 1,
    tagline: "The whole jar, every month.",
    features: [
      "Ongoing premium pick access",
      "Full pick analysis",
      "Member dashboard",
      "Pick notifications",
      "Detailed analytics",
    ],
    highlight: true,
  },
];

export const BRAND_COPY = {
  welcome: "Welcome to the Pickle Jar",
  welcomeBack: "Welcome back to the Pickle Jar.",
  freshPicks: "Fresh Picks",
  board: "The Pickle Board",
  help: "In a Pickle?",
  jarOfWins: "The Pickle Jar of Wins",
  record: "The Pickle's Record",
};

export const DISCLAIMER_SHORT =
  "Sports picks are informational and entertainment content only. Past performance does not guarantee future results. No outcome is ever guaranteed. 21+ where applicable. Please gamble responsibly.";
