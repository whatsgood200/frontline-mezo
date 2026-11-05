import { encodeFunctionData, parseUnits, zeroAddress, type Address, type Hex, type PublicClient } from "viem";
import { absorberVaultAbi, frontlineLensAbi, protectedLoanAbi, protectedLoanFactoryAbi } from "./abi";
import { FRONTLINE_ADDRESSES, MUSD_ADDRESSES } from "./addresses";
import {
  borrowerOperationsAbi,
  collSurplusPoolAbi,
  erc20Abi,
  hintHelpersAbi,
  priceFeedAbi,
  sortedTrovesAbi,
  troveManagerAbi,
} from "./musd-abi";
import * as math from "./math";
import { FRONTLINE, MUSD } from "./params";
import {
  FrontlineError,
  type AbsorberPosition,
  type ActivityItem,
  type BorrowInput,
  type KeeperRun,
  type LineLoan,
  type LineSnapshot,
  type LoanAction,
  type ProtectedLoan,
  type Side,
  type VaultStats,
} from "./types";

// Every live read and every transaction Frontline builds. Pure functions over a viem
// PublicClient, with no React and no wallet, so the browser adapter and the fork test
// share exactly the same code.

const M = MUSD_ADDRESSES.testnet;
const F = FRONTLINE_ADDRESSES;
const WAD = 10n ** 18n;
const SHARE_UNIT = 10n ** 21n;
const STATUS_ACTIVE = 1;
const LINE_DEPTH = 40n;

export interface TxRequest {
  to: Address;
  data: Hex;
  value: bigint;
  label: string;
}

const num = (x: bigint, decimals = 18) => Number(x) / 10 ** decimals;
/** Decimal amount to 18-decimal units, rounded to `dp` places first (no float drift). */
const wad = (n: number, dp = 8) => parseUnits(n.toFixed(dp), 18);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const absorberIndex = (a: string) => F.absorberTroves.findIndex((t) => t.toLowerCase() === a.toLowerCase());

async function guard<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof FrontlineError) throw err;
    console.error(`chain: ${what} failed`, err);
    throw new FrontlineError(`Could not read ${what} from Mezo testnet. Try again in a minute.`, "RPC_UNAVAILABLE");
  }
}

// ------------------------------------------------------------------ reads

export const readPrice = (c: PublicClient) => c.readContract({ address: M.priceFeed, abi: priceFeedAbi, functionName: "fetchPrice" });

export function readLine(c: PublicClient): Promise<LineSnapshot> {
  return guard("the redemption line", async () => {
    const [[rows, price, total], absorberDebt, protectedDebt, block] = await Promise.all([
      c.readContract({ address: F.lens, abi: frontlineLensAbi, functionName: "line", args: [LINE_DEPTH] }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "absorberDebt" }),
      c.readContract({ address: F.loanFactory, abi: protectedLoanFactoryAbi, functionName: "totalProtectedDebt" }),
      c.getBlockNumber(),
    ]);
    const loans: LineLoan[] = rows.map((r, i) => {
      const side: Side = r.side === 1 ? "absorber" : r.side === 2 ? "protected" : "other";
      const label = side === "absorber" ? `Absorber loan ${absorberIndex(r.owner) + 1}` : side === "protected" ? `Protected loan ${short(r.owner)}` : short(r.owner);
      return { position: i + 1, address: r.owner, label, side, ratio: num(r.icr), debt: num(r.debt), redeemedBefore: num(r.redeemedBefore) };
    });
    return {
      network: "testnet",
      block: Number(block),
      readAt: new Date().toISOString(),
      btcPrice: num(price),
      loans,
      totalLoans: Number(total),
      absorberDebt: num(absorberDebt),
      protectedDebt: num(protectedDebt),
      frontlineLive: true,
    };
  });
}

export function readVault(c: PublicClient): Promise<VaultStats> {
  return guard("the absorber vault", async () => {
    const [s, bandLow, bandHigh, sharePrice, redeemed] = await Promise.all([
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "stats" }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandLow" }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandHigh" }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "sharePrice" }),
      readAbsorberRedemptions(c, 7 * 24 * 3600),
    ]);
    const absorberDebt = num(s.absorberDebt);
    const protectedDebt = num(s.protectedDebt);
    const cov = s.coverage === 2n ** 256n - 1n ? Infinity : num(s.coverage);
    return {
      bandLow: num(bandLow),
      bandHigh: num(bandHigh),
      floor: FRONTLINE.absorberFloor,
      absorberLoans: Number(s.activeTroves),
      absorberDebt,
      protectedDebt,
      coverage: cov,
      premiumRate: absorberDebt > 0 ? num(s.premiumRate) : 0,
      // Shown even when negative: an oversupplied layer earns less than it pays (decision 008).
      absorberYieldOnBtc: absorberDebt > 0 && protectedDebt > 0 ? math.absorberYieldOnBtc(cov) : 0,
      navMusd: num(s.totalAssets),
      btcHeld: num(s.idleBtc + s.troveCollateral),
      musdHeld: num(s.musdHeld),
      sharePrice: num(sharePrice),
      redeemedLast7d: redeemed.musd,
      veBtcYield: FRONTLINE.veBtcYield,
    };
  });
}

export async function quoteBorrowLive(c: PublicClient, input: BorrowInput) {
  const line = await readLine(c);
  return math.quoteBorrow(input, { btcPrice: line.btcPrice, loans: line.loans, absorberDebt: line.absorberDebt, protectedDebt: line.protectedDebt });
}

export async function loanAddress(c: PublicClient, owner: Address): Promise<Address | null> {
  const loan = await c.readContract({ address: F.loanFactory, abi: protectedLoanFactoryAbi, functionName: "loanOf", args: [owner] });
  return loan === zeroAddress ? null : loan;
}

export function readLoan(c: PublicClient, owner: Address): Promise<ProtectedLoan | null> {
  return guard("your loan", async () => {
    const loan = await loanAddress(c, owner);
    if (!loan) return null;
    const [status, surplus] = await Promise.all([
      c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getTroveStatus", args: [loan] }),
      c.readContract({ address: M.collSurplusPool, abi: collSurplusPoolAbi, functionName: "getCollateral", args: [loan] }),
    ]);
    if (status !== STATUS_ACTIVE && surplus === 0n) return null;
    const [entire, icr, rate, premiumRate, premiumDue, buffer, opened] = await Promise.all([
      c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [loan] }),
      c.readContract({ address: loan, abi: protectedLoanAbi, functionName: "icr" }),
      c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getTroveInterestRate", args: [loan] }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "premiumRate" }),
      c.readContract({ address: loan, abi: protectedLoanAbi, functionName: "premiumDue" }),
      c.readContract({ address: F.lens, abi: frontlineLensAbi, functionName: "bufferAhead", args: [loan] }),
      c.getContractEvents({ address: F.loanFactory, abi: protectedLoanFactoryAbi, eventName: "LoanOpened", args: { owner }, fromBlock: BigInt(F.deployBlock) }),
    ]);
    const [coll, principal, interest] = entire;
    const active = status === STATUS_ACTIVE;
    const totalDebt = num(principal + interest);
    const collBtc = num(coll);
    const ratio = active ? num(icr) : 0;
    const lastOpen = opened.at(-1);
    const openedAt = lastOpen ? new Date(Number((await c.getBlock({ blockNumber: lastOpen.blockNumber })).timestamp) * 1000).toISOString() : new Date().toISOString();
    return {
      owner,
      proxy: loan,
      collateralBtc: collBtc,
      principal: num(principal),
      interestOwed: num(interest),
      totalDebt,
      ratio,
      liquidationPrice: collBtc > 0 ? (MUSD.mcr * totalDebt) / collBtc : 0,
      interestRate: Number(rate) / 10_000,
      premiumRate: num(premiumRate),
      premiumAccrued: num(premiumDue),
      bufferAhead: num(buffer[0]),
      guaranteedBuffer: num(buffer[1]),
      protectionFloor: FRONTLINE.protectionFloor,
      status: !active ? "unprotected" : ratio < MUSD.mcr ? "unprotected" : ratio < FRONTLINE.protectionFloor ? "at-risk" : "protected",
      surplusBtc: num(surplus),
      openedAt,
    };
  });
}

export function readAbsorber(c: PublicClient, owner: Address): Promise<AbsorberPosition | null> {
  return guard("your absorber position", async () => {
    const shares = await c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "balanceOf", args: [owner] });
    if (shares === 0n) return null;
    const [supply, s, sharePrice, deposits, premiums, redeemed] = await Promise.all([
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "totalSupply" }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "stats" }),
      c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "sharePrice" }),
      c.getContractEvents({ address: F.absorberVault, abi: absorberVaultAbi, eventName: "Deposited", args: { account: owner }, fromBlock: BigInt(F.deployBlock) }),
      c.getContractEvents({ address: F.absorberVault, abi: absorberVaultAbi, eventName: "PremiumReceived", fromBlock: BigInt(F.deployBlock) }),
      readAbsorberRedemptions(c, Infinity),
    ]);
    const share = num(shares, 21) / Math.max(num(supply, 21), 1e-18);
    const valueMusd = num((shares * sharePrice) / SHARE_UNIT);
    const btc = num(((s.idleBtc + s.troveCollateral) * shares) / supply);
    const price = num(s.price);
    return {
      owner,
      shares: num(shares, 21),
      shareOfVault: share,
      valueMusd,
      btc,
      // Net MUSD: the holder's slice of held MUSD minus their slice of absorber debt.
      musd: valueMusd - btc * price,
      // Approximation: premiums and conversions at today's ownership share.
      premiumsEarned: premiums.reduce((a, e) => a + num(e.args.amount ?? 0n), 0) * share,
      btcConverted: redeemed.btc * share,
      depositedBtc: deposits.reduce((a, e) => a + num(e.args.btc ?? 0n), 0),
      pendingWithdrawal: 0,
    };
  });
}

/**
 * TroveUpdated for the absorber troves from both MUSD contracts that emit it, in order.
 * BorrowerOperations (open, close, adjust) and TroveManager (redeem, liquidate) share the event
 * signature, and operation code 2 means "adjust" in one and "redeem" in the other.
 */
async function troveUpdates(c: PublicClient) {
  const logs = await c.getContractEvents({
    address: [M.troveManager, M.borrowerOperations],
    abi: troveManagerAbi,
    eventName: "TroveUpdated",
    args: { _borrower: [...F.absorberTroves] },
    fromBlock: BigInt(F.deployBlock),
  });
  return logs.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : Number(a.blockNumber - b.blockNumber)));
}

const TM_REDEEM = 2;
const isRedemption = (log: { address: Address; args: { _operation?: number } }) =>
  log.address.toLowerCase() === M.troveManager.toLowerCase() && log.args._operation === TM_REDEEM;

/** MUSD and BTC taken from absorber troves by redemptions within `windowSeconds` (Infinity = since deploy). */
async function readAbsorberRedemptions(c: PublicClient, windowSeconds: number): Promise<{ musd: number; btc: number }> {
  const logs = await troveUpdates(c);
  const cutoff = Number.isFinite(windowSeconds) ? Date.now() / 1000 - windowSeconds : 0;
  const last = new Map<string, { debt: bigint; coll: bigint }>();
  let musd = 0;
  let btc = 0;
  for (const log of logs) {
    const a = log.args;
    const key = (a._borrower ?? "").toLowerCase();
    const debt = (a._principal ?? 0n) + (a._interest ?? 0n);
    const coll = a._coll ?? 0n;
    const prev = last.get(key);
    if (isRedemption(log) && prev) {
      const ts = cutoff > 0 ? Number((await c.getBlock({ blockNumber: log.blockNumber })).timestamp) : Infinity;
      if (ts >= cutoff) {
        musd += num(prev.debt > debt ? prev.debt - debt : 0n);
        btc += num(prev.coll > coll ? prev.coll - coll : 0n);
      }
    }
    last.set(key, { debt, coll });
  }
  return { musd, btc };
}

export function readActivity(c: PublicClient): Promise<ActivityItem[]> {
  return guard("Frontline activity", async () => {
    const from = BigInt(F.deployBlock);
    const [vaultLogs, factoryLogs, troveLogs] = await Promise.all([
      c.getContractEvents({ address: F.absorberVault, abi: absorberVaultAbi, fromBlock: from }),
      c.getContractEvents({ address: F.loanFactory, abi: protectedLoanFactoryAbi, eventName: "LoanOpened", fromBlock: from }),
      troveUpdates(c),
    ]);
    type Raw = { hash: Hex; block: bigint; index: number; kind: ActivityItem["kind"]; summary: string; account: Address };
    const raw: Raw[] = [];
    for (const l of vaultLogs) {
      const base = { hash: l.transactionHash, block: l.blockNumber, index: l.logIndex };
      const a = l.args as Record<string, bigint | Address | undefined>;
      if (l.eventName === "Deposited") raw.push({ ...base, kind: "deposit", summary: `Absorber deposit: ${num(a.btc as bigint).toFixed(4)} BTC.`, account: a.account as Address });
      if (l.eventName === "Withdrawn") raw.push({ ...base, kind: "withdraw", summary: `Absorber withdrawal: ${num(a.btc as bigint).toFixed(4)} BTC and ${num(a.musd as bigint).toFixed(2)} MUSD.`, account: a.account as Address });
      if (l.eventName === "Deployed") raw.push({ ...base, kind: "rearm", summary: `Absorber loan ${Number(a.trove) + 1} deployed ${num(a.btc as bigint).toFixed(4)} BTC at ${(num(a.icr as bigint) * 100).toFixed(1)}%.`, account: F.absorberVault });
      if (l.eventName === "Rebalanced") raw.push({ ...base, kind: "rearm", summary: `Absorber loan ${Number(a.trove) + 1} rebalanced to ${(num(a.icrAfter as bigint) * 100).toFixed(1)}%.`, account: F.absorberVault });
      if (l.eventName === "Protected") raw.push({ ...base, kind: "protect", summary: `Absorber loan ${Number(a.trove) + 1} protected: repaid ${num(a.repaid as bigint).toFixed(2)} MUSD.`, account: a.caller as Address });
      if (l.eventName === "PremiumReceived") raw.push({ ...base, kind: "premium", summary: `Premium received: ${num(a.amount as bigint).toFixed(2)} MUSD.`, account: a.loan as Address });
    }
    for (const l of factoryLogs) {
      raw.push({ hash: l.transactionHash, block: l.blockNumber, index: l.logIndex, kind: "open", summary: `Protected loan opened: ${num(l.args.collateral ?? 0n).toFixed(4)} BTC, ${num(l.args.debt ?? 0n).toFixed(0)} MUSD.`, account: l.args.owner as Address });
    }
    const prev = new Map<string, bigint>();
    for (const l of troveLogs) {
      const key = (l.args._borrower ?? "").toLowerCase();
      const debt = (l.args._principal ?? 0n) + (l.args._interest ?? 0n);
      const p = prev.get(key);
      if (isRedemption(l) && p !== undefined) {
        raw.push({ hash: l.transactionHash, block: l.blockNumber, index: l.logIndex, kind: "redemption", summary: `Redemption took ${num(p - debt).toFixed(0)} MUSD from absorber loan ${absorberIndex(key) + 1}. Protected loans untouched.`, account: l.args._borrower as Address });
      }
      prev.set(key, debt);
    }
    raw.sort((x, y) => (x.block === y.block ? y.index - x.index : Number(y.block - x.block)));
    const top = raw.slice(0, 40);
    const times = new Map<bigint, string>();
    await Promise.all(
      [...new Set(top.map((r) => r.block))].map(async (b) => times.set(b, new Date(Number((await c.getBlock({ blockNumber: b })).timestamp) * 1000).toISOString())),
    );
    return top.map((r) => ({ hash: r.hash, kind: r.kind, summary: r.summary, account: r.account, at: times.get(r.block) ?? new Date().toISOString(), block: Number(r.block) }));
  });
}

export async function readKeeperLog(c: PublicClient): Promise<KeeperRun[]> {
  const items = await readActivity(c);
  return items
    .filter((i) => i.kind === "rearm" || i.kind === "protect" || i.kind === "premium")
    .map((i) => ({ at: i.at, action: i.kind === "protect" ? "protect" : i.kind === "premium" ? "collectPremium" : "rebalance", detail: i.summary, hash: i.hash }));
}

// ------------------------------------------------------------------ hints

/** Sorted-list insert hints for a trove that will hold `coll` and `debt` (18-decimal units). */
export async function insertHints(c: PublicClient, coll: bigint, debt: bigint): Promise<[Address, Address]> {
  const nicr = await c.readContract({ address: M.hintHelpers, abi: hintHelpersAbi, functionName: "computeNominalCR", args: [coll, debt] });
  const [approx] = await c.readContract({ address: M.hintHelpers, abi: hintHelpersAbi, functionName: "getApproxHint", args: [nicr, 40n, BigInt(Date.now() % 1_000_000)] });
  const [up, low] = await c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "findInsertPosition", args: [nicr, approx, approx] });
  return [up, low];
}

/** A trove's current neighbours: good hints when its ratio barely moves. */
async function neighbourHints(c: PublicClient, trove: Address): Promise<[Address, Address]> {
  const [up, low] = await Promise.all([
    c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getPrev", args: [trove] }),
    c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getNext", args: [trove] }),
  ]);
  return [up, low];
}

// ------------------------------------------------------------------ transaction builders

async function approveIfNeeded(c: PublicClient, owner: Address, spender: Address, amount: bigint): Promise<TxRequest[]> {
  const allowance = await c.readContract({ address: M.musd, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
  if (allowance >= amount) return [];
  // Exact-amount approval, never unlimited.
  return [{ to: M.musd, value: 0n, label: "Approve MUSD", data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }) }];
}

export async function buildOpenLoan(c: PublicClient, input: BorrowInput): Promise<TxRequest[]> {
  const coll = wad(input.collateralBtc);
  const debt = wad(input.borrowMusd, 2);
  const fee = await c.readContract({ address: M.borrowerOperations, abi: borrowerOperationsAbi, functionName: "getBorrowingFee", args: [debt] });
  const [up, low] = await insertHints(c, coll, debt + fee + wad(MUSD.gasDeposit, 0));
  return [{ to: F.loanFactory, value: coll, label: "Open protected loan", data: encodeFunctionData({ abi: protectedLoanFactoryAbi, functionName: "open", args: [debt, up, low] }) }];
}

export async function buildAdjust(c: PublicClient, owner: Address, action: LoanAction): Promise<TxRequest[]> {
  const loan = await loanAddress(c, owner);
  if (!loan) throw new FrontlineError("You have no protected loan yet.", "INVALID_INPUT");
  const [coll, principal, interest] = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [loan] });
  const debt = principal + interest;
  if (action.kind === "addCollateral") {
    const v = wad(action.btc);
    const [up, low] = await insertHints(c, coll + v, debt);
    return [{ to: loan, value: v, label: "Add BTC", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "addCollateral", args: [up, low] }) }];
  }
  if (action.kind === "withdrawCollateral") {
    const v = wad(action.btc);
    const [up, low] = await insertHints(c, coll - v, debt);
    return [{ to: loan, value: 0n, label: "Withdraw BTC", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "withdrawCollateral", args: [v, up, low] }) }];
  }
  if (action.kind === "borrowMore") {
    const v = wad(action.musd, 2);
    const [up, low] = await insertHints(c, coll, debt + v + v / 1000n);
    return [{ to: loan, value: 0n, label: "Borrow more", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "borrow", args: [v, up, low] }) }];
  }
  const v = wad(action.musd, 2);
  const [up, low] = await insertHints(c, coll, debt - v);
  return [
    ...(await approveIfNeeded(c, owner, loan, v)),
    { to: loan, value: 0n, label: "Repay", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "repay", args: [v, up, low] }) },
  ];
}

export async function buildCloseLoan(c: PublicClient, owner: Address): Promise<TxRequest[]> {
  const loan = await loanAddress(c, owner);
  if (!loan) throw new FrontlineError("You have no protected loan to close.", "INVALID_INPUT");
  const [entire, gasComp, premium, held] = await Promise.all([
    c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [loan] }),
    c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "MUSD_GAS_COMPENSATION" }),
    c.readContract({ address: loan, abi: protectedLoanAbi, functionName: "premiumDue" }),
    c.readContract({ address: M.musd, abi: erc20Abi, functionName: "balanceOf", args: [loan] }),
  ]);
  // Debt minus the gas deposit, plus premium owed, plus 0.5% headroom for interest accruing until the tx lands.
  const needed = entire[1] + entire[2] - gasComp + premium;
  const pull = needed > held ? ((needed - held) * 1005n) / 1000n : 0n;
  const ownerMusd = await c.readContract({ address: M.musd, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
  if (ownerMusd < pull) {
    throw new FrontlineError(`Closing needs ${num(pull).toFixed(2)} MUSD in your wallet; you hold ${num(ownerMusd).toFixed(2)}.`, "INVALID_INPUT");
  }
  return [
    ...(pull > 0n ? await approveIfNeeded(c, owner, loan, pull) : []),
    { to: loan, value: 0n, label: "Close loan", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "close" }) },
  ];
}

export async function buildClaimLoanSurplus(c: PublicClient, owner: Address): Promise<TxRequest[]> {
  const loan = await loanAddress(c, owner);
  if (!loan) throw new FrontlineError("You have no protected loan.", "INVALID_INPUT");
  return [{ to: loan, value: 0n, label: "Claim surplus", data: encodeFunctionData({ abi: protectedLoanAbi, functionName: "claimSurplus" }) }];
}

export function buildDeposit(btc: number): TxRequest[] {
  return [{ to: F.absorberVault, value: wad(btc), label: "Absorber deposit", data: encodeFunctionData({ abi: absorberVaultAbi, functionName: "deposit" }) }];
}

export async function buildWithdraw(c: PublicClient, owner: Address, shares: number): Promise<TxRequest[]> {
  const balance = await c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "balanceOf", args: [owner] });
  const requested = parseUnits(shares.toFixed(6), 21);
  const amount = requested > balance || balance - requested < 10n ** 15n ? balance : requested;
  const hints = await Promise.all(
    F.absorberTroves.map(async (t) => {
      const status = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getTroveStatus", args: [t] });
      const [upper, lower] = status === STATUS_ACTIVE ? await neighbourHints(c, t) : [zeroAddress, zeroAddress];
      return { upper, lower };
    }),
  );
  return [{ to: F.absorberVault, value: 0n, label: "Withdrawal", data: encodeFunctionData({ abi: absorberVaultAbi, functionName: "withdraw", args: [amount, hints] }) }];
}

export async function buildRedeem(c: PublicClient, amountMusd: number): Promise<TxRequest[]> {
  const price = await readPrice(c);
  const [first, partialNicr, truncated] = await c.readContract({
    address: M.hintHelpers,
    abi: hintHelpersAbi,
    functionName: "getRedemptionHints",
    args: [wad(amountMusd, 2), price, 0n],
  });
  if (truncated === 0n) throw new FrontlineError("Nothing can be redeemed at this size. Raise the amount.", "INVALID_INPUT");
  const [up, low] = await c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "findInsertPosition", args: [partialNicr, first, first] });
  return [
    {
      to: M.troveManager,
      value: 0n,
      label: `Redeem ${num(truncated).toFixed(0)} MUSD`,
      data: encodeFunctionData({ abi: troveManagerAbi, functionName: "redeemCollateral", args: [truncated, first, up, low, partialNicr, 0n] }),
    },
  ];
}

export { WAD };
