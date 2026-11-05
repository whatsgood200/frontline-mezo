import { encodeFunctionData, zeroAddress, type Address, type PublicClient } from "viem";
import { absorberVaultAbi, protectedLoanAbi, protectedLoanFactoryAbi } from "./abi";
import { FRONTLINE_ADDRESSES, MUSD_ADDRESSES } from "./addresses";
import { insertHints, readPrice, type TxRequest } from "./chain-calls";
import { borrowerOperationsAbi, collSurplusPoolAbi, sortedTrovesAbi, troveManagerAbi } from "./musd-abi";

// Keeper policy (docs/decisions/008). Plans one run from live state; the runner sends it.
//   1. Any absorber trove under the band is protected; one above it is rebalanced to the middle.
//   2. Idle BTC is deployed only up to TARGET_COVERAGE of protected debt (never far beyond it,
//      or absorbers pay more Mezo interest than they earn), with a bootstrap floor so the first
//      borrowers have room under the 0.25x coverage cap.
//   3. Premiums worth more than MIN_PREMIUM are collected.
//   4. Surplus BTC left by a full redemption is claimed.

const F = FRONTLINE_ADDRESSES;
const M = MUSD_ADDRESSES.testnet;
const WAD = 10n ** 18n;
const STATUS_ACTIVE = 1;
export const TARGET_COVERAGE = 35n * 10n ** 16n; // 0.35x
export const BOOTSTRAP_ABSORBER_DEBT = 2_500n * WAD; // room for about 10k MUSD of protected debt
const MIN_PREMIUM = WAD; // 1 MUSD
const MIN_DEPLOY_BTC = 10n ** 15n; // 0.001 BTC

export interface KeeperStep {
  action: "protect" | "rebalance" | "deploy" | "collectPremium" | "claimSurplus";
  detail: string;
  req: TxRequest;
}

export async function planKeeper(c: PublicClient): Promise<KeeperStep[]> {
  const steps: KeeperStep[] = [];
  const [price, bandLow, bandHigh, stats, gasComp, minNet, feeOn1] = await Promise.all([
    readPrice(c),
    c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandLow" }),
    c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandHigh" }),
    c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "stats" }),
    c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "MUSD_GAS_COMPENSATION" }),
    c.readContract({ address: M.borrowerOperations, abi: [{ type: "function", name: "minNetDebt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const, functionName: "minNetDebt" }),
    c.readContract({ address: M.borrowerOperations, abi: borrowerOperationsAbi, functionName: "getBorrowingFee", args: [WAD] }),
  ]);
  const mid = (bandLow + bandHigh) / 2n;

  // 1. Band keeping, and 4. surplus claims.
  const activeIdx: number[] = [];
  const inactiveIdx: number[] = [];
  for (let i = 0; i < F.absorberTroves.length; i++) {
    const t = F.absorberTroves[i] as Address;
    const status = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getTroveStatus", args: [t] });
    if (status !== STATUS_ACTIVE) {
      const surplus = await c.readContract({ address: M.collSurplusPool, abi: collSurplusPoolAbi, functionName: "getCollateral", args: [t] });
      if (surplus > 0n) {
        steps.push({ action: "claimSurplus", detail: `Claim ${fmt(surplus)} BTC surplus from absorber loan ${i + 1}`, req: tx(F.absorberVault, encodeFunctionData({ abi: absorberVaultAbi, functionName: "claimSurplus", args: [BigInt(i)] }), `Claim surplus ${i + 1}`) });
      }
      inactiveIdx.push(i);
      continue;
    }
    activeIdx.push(i);
    const icr = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getCurrentICR", args: [t, price] });
    const hint = await neighbours(c, t);
    if (icr < bandLow) {
      steps.push({ action: "protect", detail: `Absorber loan ${i + 1} at ${pct(icr)} is under the band; repay to the middle`, req: tx(F.absorberVault, encodeFunctionData({ abi: absorberVaultAbi, functionName: "protect", args: [BigInt(i), hint] }), `Protect ${i + 1}`) });
    } else if (icr > bandHigh) {
      steps.push({ action: "rebalance", detail: `Absorber loan ${i + 1} at ${pct(icr)} sits above the band; borrow back to ${pct(mid)}`, req: tx(F.absorberVault, encodeFunctionData({ abi: absorberVaultAbi, functionName: "rebalance", args: [BigInt(i), mid, hint] }), `Rebalance ${i + 1}`) });
    }
  }

  // 2. Deploy idle BTC up to target coverage.
  const target = maxBig((stats.protectedDebt * TARGET_COVERAGE) / WAD, BOOTSTRAP_ABSORBER_DEBT);
  if (stats.idleBtc > MIN_DEPLOY_BTC && stats.absorberDebt < target) {
    const gap = target - stats.absorberDebt;
    // Grow the first active trove; open the first inactive one when none is active.
    const opening = activeIdx.length === 0;
    const index = opening ? (inactiveIdx[0] ?? 0) : activeIdx[0];
    // Collateral that carries `gap` of new debt at the middle of the band.
    let btc = (gap * mid) / price;
    const minOpenDebt = gasComp + minNet;
    if (opening && gap + gasComp < minOpenDebt) btc = ((minOpenDebt + WAD * 10n) * mid) / price;
    if (btc > stats.idleBtc) btc = stats.idleBtc;
    const t = F.absorberTroves[index] as Address;
    const active = !opening;
    const entire = active ? await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [t] }) : ([0n, 0n, 0n, 0n, 0n, 0n] as const);
    const coll = entire[0] + btc;
    const debtNow = entire[1] + entire[2];
    const debtTarget = (coll * price) / mid;
    if (debtTarget > debtNow) {
      // openTrove's debt argument excludes the gas deposit; both paths pay MUSD's borrowing fee.
      const grossIncrease = debtTarget - debtNow - (active ? 0n : gasComp);
      const debtArg = (grossIncrease * WAD) / (WAD + feeOn1);
      if (active || debtArg + gasComp >= minOpenDebt) {
        const [upper, lower] = await insertHints(c, coll, debtTarget);
        steps.push({
          action: "deploy",
          detail: `Deploy ${fmt(btc)} BTC into absorber loan ${index + 1}, borrowing ${fmt(debtArg)} MUSD at ${pct(mid)}`,
          req: tx(F.absorberVault, encodeFunctionData({ abi: absorberVaultAbi, functionName: "deploy", args: [BigInt(index), btc, debtArg, { upper, lower }] }), `Deploy ${index + 1}`),
        });
      }
    }
  }

  // 3. Premiums.
  const count = await c.readContract({ address: F.loanFactory, abi: protectedLoanFactoryAbi, functionName: "loanCount" });
  for (let i = 0n; i < count; i++) {
    const loan = await c.readContract({ address: F.loanFactory, abi: protectedLoanFactoryAbi, functionName: "loanAt", args: [i] });
    const due = await c.readContract({ address: loan, abi: protectedLoanAbi, functionName: "premiumDue" });
    if (due < MIN_PREMIUM) continue;
    const entire = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [loan] });
    const [upper, lower] = await insertHints(c, entire[0], entire[1] + entire[2] + due);
    steps.push({ action: "collectPremium", detail: `Collect ${fmt(due)} MUSD premium from ${loan.slice(0, 8)}…`, req: tx(loan, encodeFunctionData({ abi: protectedLoanAbi, functionName: "collectPremium", args: [upper, lower] }), "Collect premium") });
  }
  return steps;
}

async function neighbours(c: PublicClient, t: Address) {
  const [upper, lower] = await Promise.all([
    c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getPrev", args: [t] }),
    c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getNext", args: [t] }),
  ]);
  return { upper: upper ?? zeroAddress, lower: lower ?? zeroAddress };
}

const tx = (to: Address, data: `0x${string}`, label: string): TxRequest => ({ to, data, value: 0n, label });
const maxBig = (a: bigint, b: bigint) => (a > b ? a : b);
const fmt = (x: bigint) => (Number(x) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 });
const pct = (x: bigint) => `${(Number(x) / 1e16).toFixed(1)}%`;
