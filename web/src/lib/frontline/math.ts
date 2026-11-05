import { FRONTLINE, MUSD } from "./params";
import type {
  AbsorbQuote,
  BorrowInput,
  BorrowQuote,
  LineLoan,
  RedemptionPreview,
  RedemptionStep,
  Warning,
} from "./types";

// Pure functions shared by the mock and chain adapters, so every number the UI shows
// comes from one formula. Contract code in Phase 3 must match these (see math.test.ts).

export function premiumRate(coverage: number): number {
  if (!Number.isFinite(coverage) || coverage <= 0) return FRONTLINE.premiumMax;
  return Math.min(FRONTLINE.premiumMax, Math.max(FRONTLINE.premiumMin, FRONTLINE.premiumK / coverage));
}

export function coverage(absorberDebt: number, protectedDebt: number): number {
  if (protectedDebt <= 0) return Infinity;
  return absorberDebt / protectedDebt;
}

/** Absorbers' net yield on their BTC: premium per MUSD of absorber debt, less Mezo interest, over the target ratio. */
export function absorberYieldOnBtc(cov: number): number {
  if (!Number.isFinite(cov)) return 0;
  return (premiumRate(cov) / cov - MUSD.interestRate) / FRONTLINE.absorberTargetRatio;
}

export function totalDebtFor(borrowMusd: number): { fee: number; total: number } {
  const fee = borrowMusd * MUSD.borrowingFee;
  return { fee, total: borrowMusd + fee + MUSD.gasDeposit };
}

/** Sum of debt on loans in front of a ratio (loans are ordered front first). */
export function bufferAhead(loans: LineLoan[], ratio: number): { total: number; guaranteed: number } {
  let total = 0;
  let guaranteed = 0;
  for (const loan of loans) {
    if (loan.ratio >= ratio || loan.side === "protected") break;
    total += loan.debt;
    if (loan.side === "absorber") guaranteed += loan.debt;
  }
  return { total, guaranteed };
}

export function quoteBorrow(
  input: BorrowInput,
  ctx: { btcPrice: number; loans: LineLoan[]; absorberDebt: number; protectedDebt: number; walletBtc?: number },
): BorrowQuote {
  const { fee, total } = totalDebtFor(input.borrowMusd);
  const collateralValue = input.collateralBtc * ctx.btcPrice;
  const ratio = total > 0 ? collateralValue / total : 0;
  const liquidationPrice = input.collateralBtc > 0 ? (MUSD.mcr * total) / input.collateralBtc : 0;
  const maxProtectedDebt = Math.max(0, ctx.absorberDebt / FRONTLINE.minCoverage - ctx.protectedDebt);
  const covAfter = coverage(ctx.absorberDebt, ctx.protectedDebt + total);
  const premium = premiumRate(covAfter);
  const buffer = bufferAhead(ctx.loans, ratio);

  const warnings: Warning[] = [];
  if (input.borrowMusd + fee < MUSD.minNetDebt) {
    warnings.push({
      code: "BELOW_MIN_DEBT",
      message: `Mezo's minimum loan is ${MUSD.minNetDebt.toLocaleString("en-US")} MUSD. Borrow at least ${Math.ceil(MUSD.minNetDebt / (1 + MUSD.borrowingFee)).toLocaleString("en-US")} MUSD.`,
    });
  }
  if (ratio > 0 && ratio < MUSD.mcr) {
    warnings.push({ code: "BELOW_MCR", message: "This loan would be under 110% and could be liquidated at once. Add BTC or borrow less." });
  } else if (ratio > 0 && ratio < FRONTLINE.protectionFloor) {
    warnings.push({
      code: "BELOW_PROTECTION_FLOOR",
      message: `Protected loans stay at ${Math.round(FRONTLINE.protectionFloor * 100)}% or more, above the absorber layer. Add BTC or borrow less.`,
    });
  }
  if (total > maxProtectedDebt) {
    warnings.push({
      code: "COVERAGE_CAP",
      message: `The absorber layer can protect ${Math.floor(maxProtectedDebt).toLocaleString("en-US")} MUSD more right now. Borrow less, or wait for more absorbers.`,
    });
  }
  if (ctx.walletBtc !== undefined && input.collateralBtc > ctx.walletBtc) {
    warnings.push({ code: "NOT_ENOUGH_BTC", message: "Your wallet holds less BTC than this. Lower the amount or get test BTC from the Mezo faucet." });
  }

  return {
    input,
    borrowingFee: fee,
    gasDeposit: MUSD.gasDeposit,
    totalDebt: total,
    ratio,
    liquidationPrice,
    interestRate: MUSD.interestRate,
    premiumRate: premium,
    firstYearCost: total * (MUSD.interestRate + premium),
    bufferAhead: buffer.total,
    guaranteedBuffer: buffer.guaranteed,
    maxProtectedDebt,
    warnings,
    allowed: warnings.length === 0 && input.collateralBtc > 0 && input.borrowMusd > 0,
  };
}

export function quoteAbsorb(
  depositBtc: number,
  ctx: { btcPrice: number; absorberDebt: number; protectedDebt: number; sharePrice: number },
): AbsorbQuote {
  const debtBacked = (depositBtc * ctx.btcPrice) / FRONTLINE.absorberTargetRatio;
  const covAfter = coverage(ctx.absorberDebt + debtBacked, ctx.protectedDebt);
  const netYield = absorberYieldOnBtc(covAfter);
  return {
    depositBtc,
    debtBacked,
    coverageAfter: covAfter,
    premiumRateAfter: premiumRate(covAfter),
    netYieldOnBtc: netYield,
    yearlyIncomeMusd: depositBtc * ctx.btcPrice * netYield,
    shares: ctx.sharePrice > 0 ? (depositBtc * ctx.btcPrice) / ctx.sharePrice : 0,
  };
}

/**
 * Walks the line the way TroveManager.redeemCollateral does: front first, each loan
 * giving up to (debt - gas deposit), and stopping when a partial would leave a loan
 * under the minimum net debt.
 */
export function previewRedemption(amount: number, loans: LineLoan[], btcPrice: number): RedemptionPreview {
  let remaining = amount;
  const steps: RedemptionStep[] = [];
  let fromAbsorbers = 0;
  let fromProtected = 0;
  let fromOthers = 0;
  let stopsAt: string | null = null;

  for (const loan of loans) {
    if (remaining <= 0) break;
    if (loan.ratio < MUSD.mcr) continue;
    const redeemable = Math.max(0, loan.debt - MUSD.gasDeposit);
    let taken = Math.min(remaining, redeemable);
    const leftNet = loan.debt - taken - MUSD.gasDeposit;
    if (taken < redeemable && leftNet < MUSD.minNetDebt) {
      // MUSD cancels this partial and stops the whole redemption here.
      taken = 0;
      stopsAt = loan.label;
      steps.push({ position: loan.position, label: loan.label, side: loan.side, debtBefore: loan.debt, taken, btcOut: 0 });
      break;
    }
    remaining -= taken;
    stopsAt = loan.label;
    if (loan.side === "absorber") fromAbsorbers += taken;
    else if (loan.side === "protected") fromProtected += taken;
    else fromOthers += taken;
    steps.push({
      position: loan.position,
      label: loan.label,
      side: loan.side,
      debtBefore: loan.debt,
      taken,
      btcOut: taken / btcPrice,
    });
  }

  const redeemed = fromAbsorbers + fromProtected + fromOthers;
  const btcGross = redeemed / btcPrice;
  return {
    amount,
    steps,
    stopsAt,
    fromAbsorbers,
    fromProtected,
    fromOthers,
    btcOut: btcGross * (1 - MUSD.redemptionFee),
    redemptionFeeBtc: btcGross * MUSD.redemptionFee,
    touchesOtherLoans: fromOthers > 0,
  };
}

export function withRedeemedBefore(loans: Omit<LineLoan, "redeemedBefore" | "position">[]): LineLoan[] {
  let running = 0;
  return loans.map((loan, i) => {
    const row: LineLoan = { ...loan, position: i + 1, redeemedBefore: running };
    running += loan.debt;
    return row;
  });
}
