import { createPublicClient, http, type Address, type Hex, type PublicClient } from "viem";
import { chains } from "@/lib/mezo";
import * as calls from "./chain-calls";
import { explainError, isUserRejection } from "./errors";
import { MAINNET_SNAPSHOT } from "./mainnet-snapshot";
import * as math from "./math";
import { getSigner } from "./signer";
import { FrontlineError, type FrontlineAdapter, type OnTxStatus, type TxResult } from "./types";

// The live adapter: reads Mezo testnet and Frontline's deployed contracts, and sends
// writes through the connected wallet (see signer.ts). Only confirmed state is reported.

let publicClient: PublicClient | null = null;
export function client(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({ chain: chains.testnet, transport: http(undefined, { batch: true, timeout: 15_000, retryCount: 2 }) }) as PublicClient;
  }
  return publicClient;
}

/** Testnet gas estimates can come in low (Keel, Janus): pad by 30%. */
const GAS_PAD_NUM = 13n;
const GAS_PAD_DEN = 10n;

async function execute(owner: Address, build: () => Promise<calls.TxRequest[]>, onStatus: OnTxStatus): Promise<TxResult> {
  const signer = getSigner();
  if (!signer) throw new FrontlineError("Connect a wallet first.", "NOT_CONNECTED");
  if (signer.account.toLowerCase() !== owner.toLowerCase()) {
    throw new FrontlineError("The connected wallet changed. Refresh and try again.", "NOT_CONNECTED");
  }
  const c = client();
  let requests: calls.TxRequest[];
  try {
    requests = await build();
  } catch (err) {
    if (err instanceof FrontlineError) throw err;
    throw new FrontlineError(explainError(err), "INVALID_INPUT");
  }

  let last: Hex | null = null;
  for (const req of requests) {
    const call = { account: signer.account, to: req.to, data: req.data, value: req.value };
    // Simulate each step right before sending it (an approval must land before the call it unlocks).
    let gas: bigint | undefined;
    try {
      await c.call(call);
      if (!signer.bitcoin) gas = ((await c.estimateGas(call)) * GAS_PAD_NUM) / GAS_PAD_DEN;
    } catch (err) {
      throw new FrontlineError(`${req.label}: ${explainError(err)}`, "INVALID_INPUT");
    }

    onStatus({ state: "awaiting-signature" });
    let hash: Hex;
    try {
      hash = await signer.send(req, gas);
    } catch (err) {
      if (isUserRejection(err)) {
        onStatus({ state: "rejected" });
        throw new Error("rejected");
      }
      throw new FrontlineError(`${req.label}: ${explainError(err)}`, "INVALID_INPUT");
    }

    onStatus({ state: "pending", hash });
    const receipt = await c.waitForTransactionReceipt({ hash, timeout: 180_000 });
    if (receipt.status !== "success") {
      onStatus({ state: "reverted", hash, reason: `${req.label} reverted on chain` });
      throw new Error("reverted");
    }
    last = hash;
  }
  if (!last) throw new FrontlineError("Nothing to send.", "INVALID_INPUT");
  onStatus({ state: "confirmed", hash: last });
  return { hash: last };
}

export const chainAdapter: FrontlineAdapter = {
  kind: "chain",
  getLine: () => calls.readLine(client()),
  getMainnetStats: async () => MAINNET_SNAPSHOT,
  quoteBorrow: (input) => calls.quoteBorrowLive(client(), input),
  openProtectedLoan: (owner, input, onStatus) => execute(owner, () => calls.buildOpenLoan(client(), input), onStatus),
  getLoan: (owner) => calls.readLoan(client(), owner),
  adjustLoan: (owner, action, onStatus) => execute(owner, () => calls.buildAdjust(client(), owner, action), onStatus),
  closeLoan: (owner, onStatus) => execute(owner, () => calls.buildCloseLoan(client(), owner), onStatus),
  claimLoanSurplus: (owner, onStatus) => execute(owner, () => calls.buildClaimLoanSurplus(client(), owner), onStatus),
  getVault: () => calls.readVault(client()),
  quoteAbsorb: async (depositBtc) => {
    const [v, price] = await Promise.all([calls.readVault(client()), calls.readPrice(client())]);
    return math.quoteAbsorb(depositBtc, { btcPrice: Number(price) / 1e18, absorberDebt: v.absorberDebt, protectedDebt: v.protectedDebt, sharePrice: v.sharePrice });
  },
  deposit: (owner, btc, onStatus) => execute(owner, async () => calls.buildDeposit(btc), onStatus),
  getAbsorber: (owner) => calls.readAbsorber(client(), owner),
  withdraw: (owner, shares, onStatus) => execute(owner, () => calls.buildWithdraw(client(), owner, shares), onStatus),
  previewRedemption: async (amount) => {
    const line = await calls.readLine(client());
    return math.previewRedemption(amount, line.loans, line.btcPrice);
  },
  redeem: async (owner, amount, onStatus) => {
    const line = await calls.readLine(client());
    const preview = math.previewRedemption(amount, line.loans, line.btcPrice);
    if (preview.touchesOtherLoans) {
      throw new FrontlineError("This size would reach other teams' testnet loans. Redeem Lab stops at the absorber layer: lower the amount.", "INVALID_INPUT");
    }
    return execute(owner, () => calls.buildRedeem(client(), amount), onStatus);
  },
  getActivity: () => calls.readActivity(client()),
  getKeeperLog: () => calls.readKeeperLog(client()),
};
