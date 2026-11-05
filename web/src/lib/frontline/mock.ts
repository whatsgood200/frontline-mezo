import { FRONTLINE, MUSD } from "./params";
import * as math from "./math";
import { MAINNET_SNAPSHOT } from "./mainnet-snapshot";
import { MOCK_BLOCK, MOCK_BTC_PRICE, exampleAddress, seedActivity, seedKeeper, seedLine } from "./mock-data";
import {
  FrontlineError,
  type AbsorberPosition,
  type ActivityItem,
  type FrontlineAdapter,
  type LineLoan,
  type LineSnapshot,
  type LoanAction,
  type OnTxStatus,
  type ProtectedLoan,
  type TxResult,
  type VaultStats,
} from "./types";

// Phase 2 mock. Simulates latency, signature prompts, pending, success, revert,
// user rejection, empty data and an RPC outage. Pick a scenario in the mock panel.

export type MockScenario = "normal" | "slow" | "reject" | "revert" | "empty" | "rpc-down";
export const MOCK_SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "slow", label: "Slow network" },
  { id: "reject", label: "User rejects signature" },
  { id: "revert", label: "Transaction reverts" },
  { id: "empty", label: "Empty (no Frontline loans)" },
  { id: "rpc-down", label: "RPC down" },
];

const SCENARIO_KEY = "frontline.mock.scenario";
const STORE_KEY = "frontline.mock.store.v1";

export function getScenario(): MockScenario {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(SCENARIO_KEY) : null;
    return (MOCK_SCENARIOS.find((s) => s.id === v)?.id ?? "normal") as MockScenario;
  } catch {
    return "normal";
  }
}

export function setScenario(s: MockScenario): void {
  try {
    window.localStorage.setItem(SCENARIO_KEY, s);
  } catch {
    // Storage blocked: the scenario simply resets on reload.
  }
}

interface Store {
  line: LineLoan[];
  loans: Record<string, ProtectedLoan>;
  absorbers: Record<string, AbsorberPosition>;
  activity: ActivityItem[];
  redeemedLast7d: number;
  block: number;
}

let store: Store | null = null;

function freshStore(): Store {
  return { line: seedLine(), loans: {}, absorbers: {}, activity: seedActivity(), redeemedLast7d: 3_120, block: MOCK_BLOCK };
}

function getStore(): Store {
  if (store) return store;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
    store = raw ? (JSON.parse(raw) as Store) : freshStore();
  } catch {
    store = freshStore();
  }
  return store;
}

function save(): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked: state lives for this tab only.
  }
}

export function resetMockStore(): void {
  store = freshStore();
  save();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.round(Math.random() * base * 0.6);

async function read<T>(produce: () => T): Promise<T> {
  const scenario = getScenario();
  await sleep(jitter(scenario === "slow" ? 2_400 : 450));
  if (scenario === "rpc-down") {
    throw new FrontlineError("Mezo testnet RPC is not answering. Try again in a minute.", "RPC_UNAVAILABLE");
  }
  return produce();
}

function randomHash(): `0x${string}` {
  let h = "";
  for (let i = 0; i < 64; i++) h += Math.floor(Math.random() * 16).toString(16);
  return `0x${h}`;
}

async function simulateTx(onStatus: OnTxStatus, revertReason: string, apply: (hash: `0x${string}`) => void): Promise<TxResult> {
  const scenario = getScenario();
  const slow = scenario === "slow";
  onStatus({ state: "awaiting-signature" });
  await sleep(jitter(slow ? 2_500 : 1_100));
  if (scenario === "reject") {
    onStatus({ state: "rejected" });
    throw new Error("rejected");
  }
  const hash = randomHash();
  onStatus({ state: "pending", hash });
  await sleep(jitter(slow ? 6_000 : 2_200));
  if (scenario === "revert") {
    onStatus({ state: "reverted", hash, reason: revertReason });
    throw new Error(revertReason);
  }
  apply(hash);
  getStore().block += 3;
  save();
  onStatus({ state: "confirmed", hash });
  return { hash };
}

function resort(line: LineLoan[]): LineLoan[] {
  const sorted = [...line].sort((a, b) => a.ratio - b.ratio);
  return math.withRedeemedBefore(sorted.map((l) => ({ address: l.address, label: l.label, side: l.side, ratio: l.ratio, debt: l.debt })));
}

function visibleLine(): LineLoan[] {
  const s = getStore();
  if (getScenario() === "empty") return math.withRedeemedBefore(s.line.filter((l) => l.side === "other"));
  return s.line;
}

function totals(line: LineLoan[]) {
  const absorberDebt = line.filter((l) => l.side === "absorber").reduce((a, l) => a + l.debt, 0);
  const protectedDebt = line.filter((l) => l.side === "protected").reduce((a, l) => a + l.debt, 0);
  return { absorberDebt, protectedDebt };
}

function vaultStats(): VaultStats {
  const line = visibleLine();
  const { absorberDebt, protectedDebt } = totals(line);
  const cov = math.coverage(absorberDebt, protectedDebt);
  const absorbers = line.filter((l) => l.side === "absorber");
  const btcHeld = absorbers.reduce((a, l) => a + (l.ratio * l.debt) / MOCK_BTC_PRICE, 0);
  return {
    bandLow: FRONTLINE.absorberBandLow,
    bandHigh: FRONTLINE.absorberBandHigh,
    floor: FRONTLINE.absorberFloor,
    absorberLoans: absorbers.length,
    absorberDebt,
    protectedDebt,
    coverage: cov,
    premiumRate: absorberDebt > 0 ? math.premiumRate(cov) : 0,
    absorberYieldOnBtc: absorberDebt > 0 && protectedDebt > 0 ? math.absorberYieldOnBtc(cov) : 0,
    navMusd: btcHeld * MOCK_BTC_PRICE,
    btcHeld,
    musdHeld: absorberDebt,
    sharePrice: 1.0213,
    redeemedLast7d: getScenario() === "empty" ? 0 : getStore().redeemedLast7d,
    veBtcYield: FRONTLINE.veBtcYield,
  };
}

function snapshot(network: "testnet" | "mainnet"): LineSnapshot {
  const line = visibleLine();
  const { absorberDebt, protectedDebt } = totals(line);
  return {
    network,
    block: getStore().block,
    readAt: new Date().toISOString(),
    btcPrice: MOCK_BTC_PRICE,
    loans: line,
    totalLoans: 361,
    absorberDebt,
    protectedDebt,
    frontlineLive: true,
  };
}

function loanFromLine(owner: `0x${string}`, loan: ProtectedLoan): ProtectedLoan {
  const line = getStore().line;
  const buffer = math.bufferAhead(line, loan.ratio);
  const cov = math.coverage(totals(line).absorberDebt, totals(line).protectedDebt);
  const status = loan.ratio < FRONTLINE.protectionFloor ? (loan.ratio < MUSD.mcr ? "unprotected" : "at-risk") : "protected";
  const hours = (Date.now() - new Date(loan.openedAt).getTime()) / 3_600_000;
  return {
    ...loan,
    owner,
    premiumRate: math.premiumRate(cov),
    premiumAccrued: loan.totalDebt * math.premiumRate(cov) * (hours / 8_760),
    bufferAhead: buffer.total,
    guaranteedBuffer: buffer.guaranteed,
    status,
  };
}

function recomputeLoan(loan: ProtectedLoan): ProtectedLoan {
  const ratio = loan.totalDebt > 0 ? (loan.collateralBtc * MOCK_BTC_PRICE) / loan.totalDebt : 0;
  return { ...loan, ratio, liquidationPrice: loan.collateralBtc > 0 ? (MUSD.mcr * loan.totalDebt) / loan.collateralBtc : 0 };
}

function upsertLineLoan(owner: `0x${string}`, loan: ProtectedLoan | null) {
  const s = getStore();
  const others = s.line.filter((l) => l.address.toLowerCase() !== loan?.proxy.toLowerCase() && l.address !== proxyFor(owner));
  if (loan) {
    others.push({ address: loan.proxy, label: "Your protected loan", side: "protected", ratio: loan.ratio, debt: loan.totalDebt, position: 0, redeemedBefore: 0 });
  }
  s.line = resort(others);
}

function proxyFor(owner: `0x${string}`): `0x${string}` {
  return exampleAddress(`f1${owner.slice(2, 12).toLowerCase()}`);
}

function log(kind: ActivityItem["kind"], summary: string, account: `0x${string}`, hash: `0x${string}`) {
  const s = getStore();
  s.activity = [{ hash, kind, summary, account, at: new Date().toISOString(), block: s.block }, ...s.activity].slice(0, 50);
}

const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

export const mockAdapter: FrontlineAdapter = {
  kind: "mock",

  getLine: (network) => read(() => snapshot(network)),

  getMainnetStats: () => read(() => MAINNET_SNAPSHOT),

  quoteBorrow: (input) =>
    read(() => {
      const line = visibleLine();
      return math.quoteBorrow(input, { btcPrice: MOCK_BTC_PRICE, loans: line, ...totals(line) });
    }),

  openProtectedLoan: (owner, input, onStatus) => {
    const line = visibleLine();
    const q = math.quoteBorrow(input, { btcPrice: MOCK_BTC_PRICE, loans: line, ...totals(line) });
    if (!q.allowed) return Promise.reject(new FrontlineError(q.warnings[0]?.message ?? "This loan cannot be opened.", "INVALID_INPUT"));
    if (getStore().loans[owner.toLowerCase()]) {
      return Promise.reject(new FrontlineError("You already have a protected loan. Manage it on My loan.", "INVALID_INPUT"));
    }
    return simulateTx(onStatus, "BorrowerOps: An operation that would result in ICR < MCR is not permitted", (hash) => {
      const loan = recomputeLoan({
        owner,
        proxy: proxyFor(owner),
        collateralBtc: input.collateralBtc,
        principal: input.borrowMusd + q.borrowingFee + MUSD.gasDeposit,
        interestOwed: 0,
        totalDebt: q.totalDebt,
        ratio: q.ratio,
        liquidationPrice: q.liquidationPrice,
        interestRate: MUSD.interestRate,
        premiumRate: q.premiumRate,
        premiumAccrued: 0,
        bufferAhead: q.bufferAhead,
        guaranteedBuffer: q.guaranteedBuffer,
        protectionFloor: FRONTLINE.protectionFloor,
        status: "protected",
        surplusBtc: 0,
        openedAt: new Date().toISOString(),
      });
      getStore().loans[owner.toLowerCase()] = loan;
      upsertLineLoan(owner, loan);
      log("open", `Protected loan opened: ${fmt(input.collateralBtc, 4)} BTC, ${fmt(input.borrowMusd)} MUSD at ${fmt(loan.ratio * 100, 1)}%.`, owner, hash);
    });
  },

  getLoan: (owner) =>
    read(() => {
      if (getScenario() === "empty") return null;
      const loan = getStore().loans[owner.toLowerCase()];
      return loan ? loanFromLine(owner, loan) : null;
    }),

  adjustLoan: (owner, action: LoanAction, onStatus) => {
    const s = getStore();
    const current = s.loans[owner.toLowerCase()];
    if (!current) return Promise.reject(new FrontlineError("You have no protected loan yet.", "INVALID_INPUT"));
    const next = { ...current };
    if (action.kind === "addCollateral") next.collateralBtc += action.btc;
    if (action.kind === "withdrawCollateral") next.collateralBtc -= action.btc;
    if (action.kind === "borrowMore") next.totalDebt += action.musd * (1 + MUSD.borrowingFee);
    if (action.kind === "repay") next.totalDebt -= action.musd;
    const updated = recomputeLoan(next);
    if (updated.totalDebt - MUSD.gasDeposit < MUSD.minNetDebt) {
      return Promise.reject(new FrontlineError(`A loan must keep at least ${fmt(MUSD.minNetDebt)} MUSD of debt. To repay everything, close the loan.`, "INVALID_INPUT"));
    }
    if (updated.ratio < FRONTLINE.protectionFloor) {
      return Promise.reject(new FrontlineError("That would put your loan under 150%, into the absorber layer. Add BTC or change the amount.", "INVALID_INPUT"));
    }
    return simulateTx(onStatus, "ProtectedLoan: below protection floor", (hash) => {
      s.loans[owner.toLowerCase()] = updated;
      upsertLineLoan(owner, updated);
      const what =
        action.kind === "addCollateral" ? `Added ${fmt(action.btc, 4)} BTC` :
        action.kind === "withdrawCollateral" ? `Withdrew ${fmt(action.btc, 4)} BTC` :
        action.kind === "borrowMore" ? `Borrowed ${fmt(action.musd)} MUSD more` : `Repaid ${fmt(action.musd)} MUSD`;
      log("adjust", `${what}. Ratio now ${fmt(updated.ratio * 100, 1)}%.`, owner, hash);
    });
  },

  closeLoan: (owner, onStatus) => {
    const s = getStore();
    const current = s.loans[owner.toLowerCase()];
    if (!current) return Promise.reject(new FrontlineError("You have no protected loan to close.", "INVALID_INPUT"));
    return simulateTx(onStatus, "BorrowerOps: Caller doesnt have enough mUSD to make repayment", (hash) => {
      delete s.loans[owner.toLowerCase()];
      upsertLineLoan(owner, null);
      log("close", `Protected loan closed. ${fmt(current.collateralBtc, 4)} BTC returned.`, owner, hash);
    });
  },

  claimLoanSurplus: (owner, onStatus) =>
    simulateTx(onStatus, "CollSurplusPool: No collateral available to claim", (hash) => {
      log("close", "Surplus BTC claimed.", owner, hash);
    }),

  getVault: () => read(vaultStats),

  quoteAbsorb: (depositBtc) =>
    read(() => {
      const v = vaultStats();
      return math.quoteAbsorb(depositBtc, { btcPrice: MOCK_BTC_PRICE, absorberDebt: v.absorberDebt, protectedDebt: v.protectedDebt, sharePrice: v.sharePrice });
    }),

  deposit: (owner, btc, onStatus) => {
    if (!(btc > 0)) return Promise.reject(new FrontlineError("Enter how much BTC to deposit.", "INVALID_INPUT"));
    return simulateTx(onStatus, "AbsorberVault: deposit paused in Recovery Mode", (hash) => {
      const s = getStore();
      const v = vaultStats();
      const debtBacked = (btc * MOCK_BTC_PRICE) / FRONTLINE.absorberTargetRatio;
      const target = s.line.filter((l) => l.side === "absorber").sort((a, b) => a.debt - b.debt)[0];
      if (target) target.debt += debtBacked;
      s.line = resort(s.line);
      const key = owner.toLowerCase();
      const prev = s.absorbers[key];
      const shares = (btc * MOCK_BTC_PRICE) / v.sharePrice;
      const totalShares = v.navMusd / v.sharePrice + shares;
      const next: AbsorberPosition = {
        owner,
        shares: (prev?.shares ?? 0) + shares,
        shareOfVault: ((prev?.shares ?? 0) + shares) / totalShares,
        valueMusd: ((prev?.shares ?? 0) + shares) * v.sharePrice,
        btc: (prev?.btc ?? 0) + btc,
        musd: prev?.musd ?? 0,
        premiumsEarned: prev?.premiumsEarned ?? 0,
        btcConverted: prev?.btcConverted ?? 0,
        depositedBtc: (prev?.depositedBtc ?? 0) + btc,
        pendingWithdrawal: prev?.pendingWithdrawal ?? 0,
      };
      s.absorbers[key] = next;
      log("deposit", `Absorber deposit: ${fmt(btc, 4)} BTC.`, owner, hash);
    });
  },

  getAbsorber: (owner) =>
    read(() => (getScenario() === "empty" ? null : getStore().absorbers[owner.toLowerCase()] ?? null)),

  withdraw: (owner, shares, onStatus) => {
    const s = getStore();
    const pos = s.absorbers[owner.toLowerCase()];
    if (!pos || shares <= 0 || shares > pos.shares + 1e-9) {
      return Promise.reject(new FrontlineError("You can withdraw up to the shares you hold.", "INVALID_INPUT"));
    }
    return simulateTx(onStatus, "AbsorberVault: withdrawal exceeds liquid assets", (hash) => {
      const part = shares / pos.shares;
      const outBtc = pos.btc * part;
      const outMusd = pos.musd * part;
      const left = pos.shares - shares;
      if (left <= 1e-9) delete s.absorbers[owner.toLowerCase()];
      else s.absorbers[owner.toLowerCase()] = { ...pos, shares: left, btc: pos.btc - outBtc, musd: pos.musd - outMusd, valueMusd: left * 1.0213, shareOfVault: pos.shareOfVault * (left / pos.shares) };
      log("withdraw", `Absorber withdrawal: ${fmt(outBtc, 4)} BTC and ${fmt(outMusd, 2)} MUSD.`, owner, hash);
    });
  },

  previewRedemption: (amount) => read(() => math.previewRedemption(amount, visibleLine(), MOCK_BTC_PRICE)),

  redeem: (owner, amount, onStatus) => {
    const preview = math.previewRedemption(amount, visibleLine(), MOCK_BTC_PRICE);
    if (preview.touchesOtherLoans) {
      return Promise.reject(new FrontlineError("This size would reach other teams' testnet loans. Redeem Lab stops at the absorber layer: lower the amount.", "INVALID_INPUT"));
    }
    if (preview.fromAbsorbers + preview.fromProtected === 0) {
      return Promise.reject(new FrontlineError("Nothing to redeem at this size. Raise the amount.", "INVALID_INPUT"));
    }
    return simulateTx(onStatus, "TroveManager: Unable to redeem any amount", (hash) => {
      const s = getStore();
      for (const step of preview.steps) {
        const loan = s.line.find((l) => l.position === step.position);
        if (!loan || step.taken <= 0) continue;
        const coll = (loan.ratio * loan.debt) / MOCK_BTC_PRICE - step.btcOut;
        loan.debt -= step.taken;
        loan.ratio = loan.debt > 0 ? (coll * MOCK_BTC_PRICE) / loan.debt : 0;
      }
      s.line = resort(s.line.filter((l) => l.debt > MUSD.gasDeposit));
      s.redeemedLast7d += preview.fromAbsorbers;
      for (const a of Object.values(s.absorbers)) {
        const btcGone = (preview.fromAbsorbers / MOCK_BTC_PRICE) * a.shareOfVault;
        a.btc = Math.max(0, a.btc - btcGone);
        a.musd += preview.fromAbsorbers * a.shareOfVault;
        a.btcConverted += btcGone;
      }
      log("redemption", `${fmt(amount)} MUSD redeemed. Absorbers gave ${fmt(preview.fromAbsorbers)} MUSD of BTC; protected loans untouched.`, owner, hash);
    });
  },

  getActivity: () => read(() => (getScenario() === "empty" ? [] : getStore().activity)),

  getKeeperLog: () => read(() => (getScenario() === "empty" ? [] : seedKeeper())),
};
