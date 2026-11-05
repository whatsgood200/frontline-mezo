// Protocol parameters. MUSD values are read from Mezo testnet (5 Nov 2026) and match
// github.com/mezo-org/musd; Frontline values are the design parameters in docs/plan.md.

export const MUSD = {
  /** Minimum collateral ratio before liquidation. */
  mcr: 1.1,
  /** System ratio under which Recovery Mode starts. */
  ccr: 1.5,
  minNetDebt: 1_800,
  gasDeposit: 200,
  /** One-off borrowing fee on new debt. */
  borrowingFee: 0.001,
  /** Fixed interest for new loans (InterestRateManager.interestRate = 100 bps). */
  interestRate: 0.01,
  redemptionFee: 0.0075,
} as const;

export const FRONTLINE = {
  /** Absorber loans are kept inside this ratio band at the front of the line. */
  absorberBandLow: 1.12,
  absorberBandHigh: 1.15,
  absorberFloor: 1.115,
  /** Ratio the absorber quote assumes when sizing debt from deposited BTC. */
  absorberTargetRatio: 1.25,
  /** Protected loans must stay at or above this ratio. */
  protectionFloor: 1.5,
  /** New protected debt is refused if absorber debt / protected debt would fall under this. */
  minCoverage: 0.25,
  /** premium(c) = clamp(k / c, min, max); k chosen so 0.35x coverage pays 1.25%. */
  premiumK: 0.0044,
  premiumMin: 0.005,
  premiumMax: 0.03,
  /** veBTC yield on mainnet (DefiLlama, 5 Nov 2026), shown for comparison only. */
  veBtcYield: 0.0159,
} as const;
