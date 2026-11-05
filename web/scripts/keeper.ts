/**
 * Frontline keeper: plans one run from live state (src/lib/frontline/keeper.ts) and sends it.
 *
 *   pnpm keeper              dry run: prints the plan, sends nothing
 *   KEEPER_PRIVATE_KEY=0x... pnpm keeper    sends each step (CI uses a repository secret)
 *
 * The keeper key can only call deploy, rebalance, protect, claimSurplus and collectPremium.
 * None of these can move anyone's funds out of the vault or a loan.
 */
import { createPublicClient, createWalletClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mezoTestnet } from "../src/lib/mezo";
import { explainError } from "../src/lib/frontline/errors";
import { planKeeper, readFront } from "../src/lib/frontline/keeper";

const GAS_PAD_NUM = 13n;
const GAS_PAD_DEN = 10n;

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...entry }));
}

async function main() {
  const rpc = process.env.MEZO_RPC_URL ?? mezoTestnet.rpcUrls.default.http[0];
  const client = createPublicClient({ chain: mezoTestnet, transport: http(rpc, { timeout: 60_000, retryCount: 2 }) }) as PublicClient;
  const front = await readFront(client);
  log({ action: "front", ...front, lowestRatio: front.lowestRatio === null ? null : Number(front.lowestRatio.toFixed(4)) });
  const steps = await planKeeper(client);
  if (steps.length === 0) {
    log({ action: "noop", detail: "Absorber loans inside the band, coverage on target, no premiums due." });
    return;
  }

  const key = process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    for (const s of steps) log({ action: s.action, detail: s.detail, dryRun: true });
    return;
  }

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: mezoTestnet, transport: http(rpc, { timeout: 60_000 }) });
  let failures = 0;
  for (const s of steps) {
    const call = { account: account.address, to: s.req.to, data: s.req.data, value: s.req.value };
    try {
      await client.call(call);
      const gas = ((await client.estimateGas(call)) * GAS_PAD_NUM) / GAS_PAD_DEN;
      const hash = await wallet.sendTransaction({ ...call, account, gas, chain: mezoTestnet });
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
      log({ action: s.action, detail: s.detail, hash, status: receipt.status });
      if (receipt.status !== "success") failures++;
    } catch (err) {
      failures++;
      log({ action: s.action, detail: s.detail, error: explainError(err) });
    }
  }
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  log({ action: "crash", error: explainError(err) });
  process.exitCode = 1;
});
