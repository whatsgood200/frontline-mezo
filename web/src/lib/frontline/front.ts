import { FRONTLINE, MUSD } from "./params";
import type { LineLoan } from "./types";

export interface FrontStatus {
  /** Loans that are neither absorber nor protected, ahead of the first absorber. */
  othersAhead: number;
  /** Their redeemable MUSD (debt minus the 200 MUSD gas deposit). */
  musdAhead: number;
  /** Lowest collateral ratio among them (MUSD liquidates under 110%). */
  lowestRatio: number | null;
  absorberAtFront: boolean;
}

/**
 * How clear the front of the redemption line is for the absorber layer: the other loans ahead
 * of the first absorber loan or, before any is deployed, the ones under the band's lower edge
 * (an absorber opened at the band would queue behind them).
 */
export function frontStatus(loans: LineLoan[], bandLow: number = FRONTLINE.absorberBandLow): FrontStatus {
  const hasAbsorber = loans.some((l) => l.side === "absorber");
  let othersAhead = 0;
  let musdAhead = 0;
  let lowestRatio: number | null = null;
  for (const loan of loans) {
    if (loan.side === "absorber") break;
    if (loan.side === "protected") break;
    if (!hasAbsorber && loan.ratio >= bandLow) break;
    othersAhead++;
    musdAhead += Math.max(0, loan.debt - MUSD.gasDeposit);
    lowestRatio = lowestRatio === null ? loan.ratio : Math.min(lowestRatio, loan.ratio);
  }
  return { othersAhead, musdAhead, lowestRatio, absorberAtFront: loans[0]?.side === "absorber" };
}
