/**
 * Prepares a local anvil fork of Mezo testnet for the recorded demo (labelled as a fork).
 *
 *   anvil --fork-url https://rpc.test.mezo.org --chain-id 31611 --port 8546
 *   pnpm fork:setup
 *
 * 1. Puts MockAggregator's code at Mezo's BTC/USD oracle precompile (a fork cannot run it).
 * 2. Clears the front of the line: impersonates the borrowers of loans under 116% and adds
 *    collateral to them, so they move back in MUSD's order. Fork only: nothing touches testnet,
 *    and the price stays at testnet's live value.
 * 3. An absorber (anvil account 1) deposits BTC and the keeper (impersonated deployer)
 *    deploys an absorber loan in the middle of the band.
 * The fork demo wallet in the app is anvil account 0.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createTestClient, createWalletClient, encodeFunctionData, http, pad, parseAbi, toHex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { absorberVaultAbi } from "../src/lib/frontline/abi";
import { FRONTLINE_ADDRESSES, MUSD_ADDRESSES } from "../src/lib/frontline/addresses";
import { buildDeposit, insertHints, readLine, type TxRequest } from "../src/lib/frontline/chain-calls";
import { borrowerOperationsAbi, priceFeedAbi, sortedTrovesAbi, troveManagerAbi } from "../src/lib/frontline/musd-abi";
import { mezoTestnet } from "../src/lib/mezo";

const FORK = process.env.FORK_RPC_URL ?? "http://127.0.0.1:8546";
const ORACLE = "0x7b7c000000000000000000000000000000000015" as const;
const KEEPER = "0xd4171f06Da70216E0bB1069E41907F3d6723a097" as const;
const ABSORBER = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"); // anvil #1
const WAD = 10n ** 18n;
const M = MUSD_ADDRESSES.testnet;
const F = FRONTLINE_ADDRESSES;
const addCollAbi = parseAbi(["function addColl(address upperHint, address lowerHint) payable"]);

const chain = { ...mezoTestnet, rpcUrls: { default: { http: [FORK] } } };
const c = createPublicClient({ chain, transport: http(FORK, { timeout: 300_000 }) }) as PublicClient;
const test = createTestClient({ chain, mode: "anvil", transport: http(FORK, { timeout: 300_000 }) });

async function send(from: `0x${string}`, req: TxRequest, signer?: typeof ABSORBER) {
  const call = { account: from, to: req.to, data: req.data, value: req.value };
  await c.call(call);
  const gas = ((await c.estimateGas(call)) * 13n) / 10n;
  const wallet = createWalletClient({ account: signer ?? from, chain, transport: http(FORK, { timeout: 300_000 }) });
  const hash = await wallet.sendTransaction({ account: signer ?? from, to: req.to, data: req.data, value: req.value, gas, chain });
  const r = await c.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${req.label} reverted`);
  console.log(`  ok  ${req.label}  ${hash}`);
}

async function main() {
  const remote = createPublicClient({ chain: mezoTestnet, transport: http("https://rpc.test.mezo.org") });
  const price = await remote.readContract({ address: M.priceFeed, abi: priceFeedAbi, functionName: "fetchPrice" });
  const artifact = JSON.parse(readFileSync(resolve(__dirname, "../../contracts/out/MockAggregator.sol/MockAggregator.json"), "utf8"));
  await test.setCode({ address: ORACLE, bytecode: artifact.deployedBytecode.object });
  await test.impersonateAccount({ address: KEEPER });
  await test.setBalance({ address: KEEPER, value: 10n * WAD });
  await test.setStorageAt({ address: ORACLE, index: 0, value: pad(toHex(price), { size: 32 }) });
  console.log(`fork price ${(Number(price) / 1e18).toFixed(0)} (testnet live)`);

  const target = 2n * WAD; // move low loans to 200%
  for (let i = 0; i < 120; i++) {
    const last = await c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getLast" });
    const icr = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getCurrentICR", args: [last, price] });
    if (icr >= 116n * 10n ** 16n) {
      console.log(`front clear: lowest other loan now ${(Number(icr) / 1e16).toFixed(2)}%`);
      break;
    }
    const [coll, principal, interest] = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getEntireDebtAndColl", args: [last] });
    const debt = principal + interest;
    const add = (debt * target) / price - coll + WAD / 1000n;
    await test.impersonateAccount({ address: last });
    await test.setBalance({ address: last, value: add + WAD });
    const [up, low] = await insertHints(c, coll + add, debt);
    await send(last, { to: M.borrowerOperations, value: add, label: `move ${last.slice(0, 8)} from ${(Number(icr) / 1e16).toFixed(2)}% to 200%`, data: encodeFunctionData({ abi: addCollAbi, functionName: "addColl", args: [up, low] }) });
    await test.stopImpersonatingAccount({ address: last });
  }

  console.log("absorber deposits 0.5 BTC");
  await send(ABSORBER.address, buildDeposit(0.5)[0], ABSORBER);

  // Keeper deploys 0.45 BTC into absorber loan 1 at the middle of the band.
  const [bandLow, bandHigh, feeOn1, gasComp] = await Promise.all([
    c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandLow" }),
    c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "bandHigh" }),
    c.readContract({ address: M.borrowerOperations, abi: borrowerOperationsAbi, functionName: "getBorrowingFee", args: [WAD] }),
    c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "MUSD_GAS_COMPENSATION" }),
  ]);
  const mid = (bandLow + bandHigh) / 2n;
  const btc = (45n * WAD) / 100n;
  const total = (btc * price) / mid;
  const debtArg = ((total - gasComp) * WAD) / (WAD + feeOn1);
  const [upper, lower] = await insertHints(c, btc, total);
  await send(KEEPER, { to: F.absorberVault, value: 0n, label: "keeper deploys absorber loan 1", data: encodeFunctionData({ abi: absorberVaultAbi, functionName: "deploy", args: [0n, btc, debtArg, { upper, lower }] }) });

  const line = await readLine(c);
  console.log("front of the line:", line.loans.slice(0, 4).map((l) => `${l.label} ${(l.ratio * 100).toFixed(1)}% ${l.debt.toFixed(0)}`));
  console.log(`absorber debt ${line.absorberDebt.toFixed(0)} MUSD; BTC on the fork $${line.btcPrice.toFixed(0)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
