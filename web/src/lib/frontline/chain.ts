import { createPublicClient, http, parseAbi, type Address } from "viem";
import { chains } from "@/lib/mezo";
import { MUSD_ADDRESSES } from "./addresses";
import { MAINNET_SNAPSHOT } from "./mainnet-snapshot";
import { withRedeemedBefore } from "./math";
import { FrontlineError, NotDeployedError, type FrontlineAdapter, type LineSnapshot } from "./types";

// Real Mezo reads. Frontline-specific calls throw NotDeployedError until Phase 3 deploys
// AbsorberVault and ProtectedLoanFactory; the UI shows that state plainly.

const troveManagerAbi = parseAbi([
  "function getCurrentICR(address,uint256) view returns (uint256)",
  "function getTroveDebt(address) view returns (uint256)",
  "function getTroveOwnersCount() view returns (uint256)",
]);
const sortedTrovesAbi = parseAbi([
  "function getLast() view returns (address)",
  "function getPrev(address) view returns (address)",
]);
const priceFeedAbi = parseAbi(["function fetchPrice() view returns (uint256)"]);

const LINE_DEPTH = 15;
const ZERO = "0x0000000000000000000000000000000000000000";

function client(network: "testnet" | "mainnet") {
  return createPublicClient({ chain: chains[network], transport: http(undefined, { batch: true, timeout: 10_000 }) });
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function readLine(network: "testnet" | "mainnet"): Promise<LineSnapshot> {
  const c = client(network);
  const a = MUSD_ADDRESSES[network];
  try {
    const [block, priceRaw, count, last] = await Promise.all([
      c.getBlockNumber(),
      c.readContract({ address: a.priceFeed, abi: priceFeedAbi, functionName: "fetchPrice" }),
      c.readContract({ address: a.troveManager, abi: troveManagerAbi, functionName: "getTroveOwnersCount" }),
      c.readContract({ address: a.sortedTroves, abi: sortedTrovesAbi, functionName: "getLast" }),
    ]);
    const owners: Address[] = [];
    let cursor: Address = last;
    while (cursor !== ZERO && owners.length < LINE_DEPTH) {
      owners.push(cursor);
      cursor = await c.readContract({ address: a.sortedTroves, abi: sortedTrovesAbi, functionName: "getPrev", args: [cursor] });
    }
    const rows = await Promise.all(
      owners.map(async (owner) => {
        const [icr, debt] = await Promise.all([
          c.readContract({ address: a.troveManager, abi: troveManagerAbi, functionName: "getCurrentICR", args: [owner, priceRaw] }),
          c.readContract({ address: a.troveManager, abi: troveManagerAbi, functionName: "getTroveDebt", args: [owner] }),
        ]);
        return { address: owner, label: short(owner), side: "other" as const, ratio: Number(icr) / 1e18, debt: Number(debt) / 1e18 };
      }),
    );
    return {
      network,
      block: Number(block),
      readAt: new Date().toISOString(),
      btcPrice: Number(priceRaw) / 1e18,
      loans: withRedeemedBefore(rows),
      totalLoans: Number(count),
      absorberDebt: 0,
      protectedDebt: 0,
      frontlineLive: false,
    };
  } catch (err) {
    console.error("chain.getLine failed", { network, err });
    throw new FrontlineError(`Mezo ${network} RPC is not answering. Try again in a minute.`, "RPC_UNAVAILABLE");
  }
}

const notDeployed = (feature: string) => () => Promise.reject(new NotDeployedError(feature));

export const chainAdapter: FrontlineAdapter = {
  kind: "chain",
  getLine: readLine,
  getMainnetStats: async () => MAINNET_SNAPSHOT,
  quoteBorrow: notDeployed("Protected borrowing"),
  openProtectedLoan: notDeployed("Protected borrowing"),
  getLoan: async () => null,
  adjustLoan: notDeployed("Loan management"),
  closeLoan: notDeployed("Loan management"),
  claimLoanSurplus: notDeployed("Loan management"),
  getVault: notDeployed("The absorber vault"),
  quoteAbsorb: notDeployed("The absorber vault"),
  deposit: notDeployed("The absorber vault"),
  getAbsorber: async () => null,
  withdraw: notDeployed("The absorber vault"),
  previewRedemption: notDeployed("Redeem Lab"),
  redeem: notDeployed("Redeem Lab"),
  getActivity: async () => [],
  getKeeperLog: async () => [],
};
