/**
 * American odds math. All stakes are in "units".
 * Profit on a winning bet at -110 for 1u = 0.909u. At +150 for 1u = 1.5u.
 */
export function profitMultiplier(americanOdds: number): number {
  if (americanOdds === 0 || !Number.isFinite(americanOdds)) return 0;
  return americanOdds > 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);
}

export function decimalOdds(americanOdds: number): number {
  return 1 + profitMultiplier(americanOdds);
}

export function impliedProbability(americanOdds: number): number {
  if (americanOdds > 0) return 100 / (americanOdds + 100);
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

export type Outcome = "win" | "loss" | "push" | "void";

/** Net units for a settled bet. Push/void return 0. */
export function settleUnits(outcome: Outcome, americanOdds: number, stake: number): number {
  switch (outcome) {
    case "win":
      return round2(stake * profitMultiplier(americanOdds));
    case "loss":
      return round2(-stake);
    default:
      return 0;
  }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Average American odds via decimal mean (avoids +/- discontinuity). */
export function averageAmericanOdds(oddsList: number[]): number | null {
  if (!oddsList.length) return null;
  const meanDecimal = oddsList.reduce((a, o) => a + decimalOdds(o), 0) / oddsList.length;
  const mult = meanDecimal - 1;
  if (mult >= 1) return Math.round(mult * 100);
  return -Math.round(100 / mult);
}
