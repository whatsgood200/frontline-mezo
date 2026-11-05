// One typed boundary for every chain read and write the app makes.
// `mock.ts` implements it for Phase 2; `chain.ts` implements it against Mezo.

export type Side = "absorber" | "protected" | "other";

export interface LineLoan {
  /** 1 = next to be redeemed. */
  position: number;
  address: `0x${string}`;
  label: string;
  side: Side;
  /** Current collateral ratio, 1.0 = 100%. */
  ratio: number;
  /** Total debt in MUSD (principal + interest + 200 gas deposit). */
  debt: number;
  /** MUSD that must be redeemed before this loan is touched. */
  redeemedBefore: number;
}

export interface LineSnapshot {
  network: "testnet" | "mainnet";
  block: number;
  readAt: string;
  btcPrice: number;
  loans: LineLoan[];
  totalLoans: number;
  absorberDebt: number;
  protectedDebt: number;
  /** True when Frontline contracts are live on this network. */
  frontlineLive: boolean;
}

export interface MainnetStats {
  troveHitsByRedemption: number;
  troveHitsByLiquidation: number;
  redemptions: number;
  musdRedeemed: number;
  btcTaken: number;
  borrowersRedeemed: number;
  openLoans: number;
  musdPrice: number;
  asOf: string;
  source: string;
}

export interface BorrowInput {
  collateralBtc: number;
  borrowMusd: number;
}

export interface Warning {
  code:
    | "BELOW_MIN_DEBT"
    | "BELOW_PROTECTION_FLOOR"
    | "BELOW_MCR"
    | "COVERAGE_CAP"
    | "RECOVERY_MODE"
    | "NOT_ENOUGH_BTC";
  message: string;
}

export interface BorrowQuote {
  input: BorrowInput;
  borrowingFee: number;
  gasDeposit: number;
  totalDebt: number;
  ratio: number;
  liquidationPrice: number;
  interestRate: number;
  premiumRate: number;
  firstYearCost: number;
  bufferAhead: number;
  guaranteedBuffer: number;
  /** True when the borrower sits behind every loan that was read, so `bufferAhead` is a lower bound. */
  bufferIsMinimum: boolean;
  maxProtectedDebt: number;
  warnings: Warning[];
  allowed: boolean;
}

export interface ProtectedLoan {
  owner: `0x${string}`;
  proxy: `0x${string}`;
  collateralBtc: number;
  principal: number;
  interestOwed: number;
  totalDebt: number;
  ratio: number;
  liquidationPrice: number;
  interestRate: number;
  premiumRate: number;
  premiumAccrued: number;
  bufferAhead: number;
  guaranteedBuffer: number;
  protectionFloor: number;
  status: "protected" | "at-risk" | "unprotected";
  surplusBtc: number;
  openedAt: string;
}

export type LoanAction =
  | { kind: "addCollateral"; btc: number }
  | { kind: "withdrawCollateral"; btc: number }
  | { kind: "borrowMore"; musd: number }
  | { kind: "repay"; musd: number };

export interface VaultStats {
  bandLow: number;
  bandHigh: number;
  floor: number;
  absorberLoans: number;
  absorberDebt: number;
  protectedDebt: number;
  coverage: number;
  premiumRate: number;
  absorberYieldOnBtc: number;
  navMusd: number;
  btcHeld: number;
  musdHeld: number;
  sharePrice: number;
  redeemedLast7d: number;
  veBtcYield: number;
}

export interface AbsorbQuote {
  depositBtc: number;
  debtBacked: number;
  coverageAfter: number;
  premiumRateAfter: number;
  netYieldOnBtc: number;
  yearlyIncomeMusd: number;
  shares: number;
}

export interface AbsorberPosition {
  owner: `0x${string}`;
  shares: number;
  shareOfVault: number;
  valueMusd: number;
  btc: number;
  musd: number;
  premiumsEarned: number;
  btcConverted: number;
  depositedBtc: number;
  pendingWithdrawal: number;
}

export interface RedemptionStep {
  position: number;
  label: string;
  side: Side;
  debtBefore: number;
  taken: number;
  btcOut: number;
}

export interface RedemptionPreview {
  amount: number;
  steps: RedemptionStep[];
  stopsAt: string | null;
  fromAbsorbers: number;
  fromProtected: number;
  fromOthers: number;
  btcOut: number;
  redemptionFeeBtc: number;
  /** Frontline refuses to run a lab redemption that would hit other teams' loans. */
  touchesOtherLoans: boolean;
}

export type ActivityKind =
  | "deposit"
  | "withdraw"
  | "open"
  | "adjust"
  | "close"
  | "redemption"
  | "rearm"
  | "premium"
  | "protect";

export interface ActivityItem {
  hash: `0x${string}`;
  kind: ActivityKind;
  summary: string;
  account: `0x${string}`;
  at: string;
  block: number;
}

export interface KeeperRun {
  at: string;
  action: "rebalance" | "rearm" | "collectPremium" | "protect" | "noop";
  detail: string;
  hash: `0x${string}` | null;
}

/** Lifecycle every write goes through; the UI renders each state. */
export type TxStatus =
  | { state: "idle" }
  | { state: "awaiting-signature" }
  | { state: "pending"; hash: `0x${string}` }
  | { state: "confirmed"; hash: `0x${string}` }
  | { state: "reverted"; hash: `0x${string}`; reason: string }
  | { state: "rejected" }
  | { state: "failed"; reason: string };

export type OnTxStatus = (status: TxStatus) => void;

export interface TxResult {
  hash: `0x${string}`;
}

export interface FrontlineAdapter {
  kind: "mock" | "chain";
  getLine(network: "testnet" | "mainnet"): Promise<LineSnapshot>;
  getMainnetStats(): Promise<MainnetStats>;
  quoteBorrow(input: BorrowInput): Promise<BorrowQuote>;
  openProtectedLoan(owner: `0x${string}`, input: BorrowInput, onStatus: OnTxStatus): Promise<TxResult>;
  getLoan(owner: `0x${string}`): Promise<ProtectedLoan | null>;
  adjustLoan(owner: `0x${string}`, action: LoanAction, onStatus: OnTxStatus): Promise<TxResult>;
  closeLoan(owner: `0x${string}`, onStatus: OnTxStatus): Promise<TxResult>;
  claimLoanSurplus(owner: `0x${string}`, onStatus: OnTxStatus): Promise<TxResult>;
  getVault(): Promise<VaultStats>;
  quoteAbsorb(depositBtc: number): Promise<AbsorbQuote>;
  deposit(owner: `0x${string}`, btc: number, onStatus: OnTxStatus): Promise<TxResult>;
  getAbsorber(owner: `0x${string}`): Promise<AbsorberPosition | null>;
  withdraw(owner: `0x${string}`, shares: number, onStatus: OnTxStatus): Promise<TxResult>;
  previewRedemption(amountMusd: number): Promise<RedemptionPreview>;
  redeem(owner: `0x${string}`, amountMusd: number, onStatus: OnTxStatus): Promise<TxResult>;
  getActivity(): Promise<ActivityItem[]>;
  getKeeperLog(): Promise<KeeperRun[]>;
}

/** Thrown by the chain adapter for features whose contracts are not deployed yet. */
export class NotDeployedError extends Error {
  constructor(feature: string) {
    super(`${feature} goes live when the Frontline contracts are deployed on Mezo testnet.`);
    this.name = "NotDeployedError";
  }
}

/** A user-facing error with a plain-language next step. */
export class FrontlineError extends Error {
  constructor(
    message: string,
    public readonly code: "RPC_UNAVAILABLE" | "WRONG_NETWORK" | "NOT_CONNECTED" | "INVALID_INPUT",
  ) {
    super(message);
    this.name = "FrontlineError";
  }
}
