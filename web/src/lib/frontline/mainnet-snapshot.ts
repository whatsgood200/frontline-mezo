import type { MainnetStats } from "./types";

// Real Mezo mainnet figures, computed on 2026-11-05 from every Redemption and TroveUpdated
// event on TroveManager 0x94AfB503dBca74aC3E4929BACEeDfCe19B93c193 (Blockscout API,
// api.explorer.mezo.org), getTroveOwnersCount(), and the Aerodrome MUSD/USDC price on Base.
// Method: docs/idea-research.md section 1. A scheduled refresh replaces this in Phase 5.
export const MAINNET_SNAPSHOT: MainnetStats = {
  troveHitsByRedemption: 1_310,
  troveHitsByLiquidation: 28,
  redemptions: 1_176,
  musdRedeemed: 5_885_215,
  btcTaken: 78.878,
  borrowersRedeemed: 189,
  openLoans: 3,
  musdPrice: 0.99,
  asOf: "2026-11-05T11:00:00Z",
  source: "TroveManager events, Mezo mainnet",
};
