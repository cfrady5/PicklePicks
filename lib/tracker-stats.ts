import type { TrackedBet } from "@/lib/data/types";
import { round2 } from "@/lib/odds";

export function trackerStats(bets: TrackedBet[]) {
  const settled = bets.filter((b) => b.result !== "pending");
  const graded = settled.filter((b) => b.result === "win" || b.result === "loss");
  const wins = settled.filter((b) => b.result === "win").length;
  const losses = settled.filter((b) => b.result === "loss").length;
  const staked = round2(graded.reduce((a, b) => a + b.stakeAmount, 0));
  const net = round2(settled.reduce((a, b) => a + b.netAmount, 0));
  return {
    total: bets.length,
    pending: bets.length - settled.length,
    wins,
    losses,
    pushes: settled.length - wins - losses,
    staked,
    net,
    roi: staked > 0 ? net / staked : null,
    winRate: graded.length ? wins / graded.length : null,
  };
}
