import { BaseError, decodeErrorResult, type Hex } from "viem";
import { absorberVaultAbi, protectedLoanAbi, protectedLoanFactoryAbi } from "./abi";

// Turns reverts into one plain sentence that says what to do next.

const MESSAGES: Record<string, string> = {
  BelowProtectionFloor: "That would put the loan under 150%, into the absorber layer. Add BTC or change the amount.",
  CoverageCap: "The absorber layer cannot cover that much more protected debt right now. Borrow less, or wait for more absorbers.",
  LoanStillActive: "You already have a protected loan. Manage it on My loan.",
  NotOwner: "Only the loan's owner can do that. Connect the wallet that opened it.",
  NothingToCollect: "No premium has accrued yet.",
  DepositTooSmall: "The smallest deposit is 0.0001 BTC.",
  DepositsArePaused: "Deposits are paused for now.",
  ZeroShares: "That amount is too small to mint or burn a share.",
  Illiquid: "The vault does not hold enough MUSD for this right now. Try a smaller amount.",
  NotUnderBand: "That absorber loan is inside its band; it does not need protecting.",
  OutsideBand: "That would move the absorber loan outside its band.",
  HintCount: "The withdrawal was built with stale data. Refresh and try again.",
};

const ABI = [...absorberVaultAbi, ...protectedLoanAbi, ...protectedLoanFactoryAbi];

const KNOWN_STRINGS: [RegExp, string][] = [
  [/net debt must be greater than minimum/i, "Mezo's minimum loan is 1,800 MUSD of net debt. Borrow more, or close the loan to repay everything."],
  [/ICR < MCR|would result in ICR/i, "That would put the loan under 110%, where MUSD liquidates. Add BTC or borrow less."],
  [/Recovery Mode/i, "Mezo is in Recovery Mode, which blocks this action for now."],
  [/insufficient funds/i, "Your wallet does not hold enough BTC for this plus gas."],
  [/Unable to redeem any amount/i, "Nothing can be redeemed at this size. Change the amount."],
  [/Oracle is stale/i, "Mezo's price feed is stale right now. Try again in a minute."],
];

export function explainError(err: unknown): string {
  if (err instanceof BaseError) {
    const withData = err.walk((e) => typeof (e as { data?: unknown }).data === "string") as { data?: Hex } | null;
    if (withData?.data && withData.data.length >= 10) {
      try {
        // Widened: viem also decodes the built-in Error(string), which our ABIs do not list.
        const decoded = decodeErrorResult({ abi: ABI, data: withData.data }) as { errorName: string; args?: readonly unknown[] };
        // MUSD reverts with strings.
        if (decoded.errorName === "Error") return explainRevertString(String(decoded.args?.[0] ?? ""));
        if (MESSAGES[decoded.errorName]) return MESSAGES[decoded.errorName];
        return `The contract refused this (${decoded.errorName}).`;
      } catch {
        // Not one of ours: fall through to MUSD's revert strings.
      }
    }
    const text = `${err.shortMessage} ${err.details ?? ""}`;
    for (const [re, msg] of KNOWN_STRINGS) if (re.test(text)) return msg;
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : "Something went wrong. Nothing was sent.";
}

function explainRevertString(reason: string): string {
  for (const [re, msg] of KNOWN_STRINGS) if (re.test(reason)) return msg;
  return reason ? `The contract refused this: ${reason}.` : "The contract refused this without a reason.";
}

export function isUserRejection(err: unknown): boolean {
  if (err instanceof BaseError) {
    return !!err.walk((e) => (e as { code?: number }).code === 4001 || /user (rejected|denied)/i.test((e as Error).message ?? ""));
  }
  return /user (rejected|denied)/i.test(String(err));
}
