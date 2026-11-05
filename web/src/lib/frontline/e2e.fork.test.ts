import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  pad,
  parseAbi,
  toHex,
  type Address,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { absorberVaultAbi } from "./abi";
import { FRONTLINE_ADDRESSES, MUSD_ADDRESSES } from "./addresses";
import * as calls from "./chain-calls";
import { planKeeper } from "./keeper";
import * as math from "./math";
import { sortedTrovesAbi, troveManagerAbi } from "./musd-abi";

// End-to-end: every Frontline write the app sends, through the same builders the browser
// uses, on an anvil fork of Mezo testnet with the real MUSD contracts and our deployed ones.
//
//   anvil --fork-url https://rpc.test.mezo.org --chain-id 31611 --port 8546
//   ANVIL_URL=http://127.0.0.1:8546 pnpm vitest run e2e.fork
//
// The fork cannot run Mezo's BTC/USD oracle precompile, so a MockAggregator's code is placed
// at its address. To clear the front of the line (other testnet loans at 111.7 to 115.5% today),
// the fork drops the price 5% and liquidates the loans that fall under 110%. Fork only.

const ANVIL = process.env.ANVIL_URL;
// Clients are built at collection time even when skipped; this default is never called then.
const RPC_URL = ANVIL ?? "http://127.0.0.1:8546";
const ORACLE = "0x7b7c000000000000000000000000000000000015" as const;
const KEEPER = "0xd4171f06Da70216E0bB1069E41907F3d6723a097" as const; // deployer and keeper
// anvil's public development keys (never used outside a local fork).
const ALICE = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const BOB = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const REDEEMER = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

const M = MUSD_ADDRESSES.testnet;
const F = FRONTLINE_ADDRESSES;
const WAD = 10n ** 18n;
const boAbi = parseAbi(["function openTrove(uint256 debt, address upperHint, address lowerHint) payable"]);
const liquidateAbi = parseAbi(["function liquidate(address borrower)"]);

describe.skipIf(!ANVIL)("Frontline end to end on a Mezo testnet fork", () => {
  const chain = defineChain({ id: 31611, name: "Mezo fork", nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } });
  // anvil pulls remote testnet state lazily, so hint sampling can take a while on first touch.
  const rpc = () => http(RPC_URL, { timeout: 300_000 });
  const c = createPublicClient({ chain, transport: rpc() }) as PublicClient;
  const test = createTestClient({ chain, mode: "anvil", transport: rpc() });
  let price = 0n;
  let snapshot: `0x${string}` | undefined;

  async function send(from: Address, req: calls.TxRequest) {
    const account = [ALICE, BOB, REDEEMER].find((a) => a.address === from);
    const call = { account: from, to: req.to, data: req.data, value: req.value };
    await c.call(call); // simulate first, exactly as the app does
    const wallet = account ? createWalletClient({ account, chain, transport: rpc() }) : createWalletClient({ account: from, chain, transport: rpc() });
    const gas = ((await c.estimateGas(call)) * 13n) / 10n;
    const hash = await wallet.sendTransaction({ account: account ?? from, to: req.to, data: req.data, value: req.value, gas, chain });
    const receipt = await c.waitForTransactionReceipt({ hash });
    expect(receipt.status, req.label).toBe("success");
    return receipt;
  }

  async function sendAll(from: Address, reqs: calls.TxRequest[]) {
    for (const r of reqs) await send(from, r);
  }

  beforeAll(async () => {
    snapshot = await test.snapshot();
    const artifact = JSON.parse(readFileSync(resolve(__dirname, "../../../../contracts/out/MockAggregator.sol/MockAggregator.json"), "utf8"));
    await test.setCode({ address: ORACLE, bytecode: artifact.deployedBytecode.object });
    const live = 77_000n * WAD; // close to testnet's price today; the 5% drop below matters, not the level
    price = (live * 95n) / 100n;
    await test.setStorageAt({ address: ORACLE, index: 0, value: pad(toHex(price), { size: 32 }) });
    for (const a of [ALICE, BOB, REDEEMER]) await test.setBalance({ address: a.address, value: 100n * WAD });
    await test.impersonateAccount({ address: KEEPER });
    await test.setBalance({ address: KEEPER, value: 10n * WAD });

    // Clear the front: liquidate every loan now under 110%.
    for (let i = 0; i < 60; i++) {
      const last = await c.readContract({ address: M.sortedTroves, abi: sortedTrovesAbi, functionName: "getLast" });
      const icr = await c.readContract({ address: M.troveManager, abi: troveManagerAbi, functionName: "getCurrentICR", args: [last, price] });
      if (icr >= 11n * 10n ** 17n) break;
      await send(REDEEMER.address, { to: M.troveManager, value: 0n, label: "liquidate", data: encodeFunctionData({ abi: liquidateAbi, functionName: "liquidate", args: [last] }) });
    }
  }, 600_000);

  afterAll(async () => {
    if (snapshot) await test.revert({ id: snapshot });
  });

  it("runs the whole product: deposit, keeper deploy, protected loan, redemption, repay, premium, withdraw", async () => {
    // 1. Alice deposits as an absorber.
    await sendAll(ALICE.address, calls.buildDeposit(0.9));
    expect((await calls.readAbsorber(c, ALICE.address))?.shares).toBeGreaterThan(0);

    // 2. The keeper deploys idle BTC up to its bootstrap target, at the front of the line.
    const plan = await planKeeper(c);
    const deploy = plan.find((s) => s.action === "deploy");
    expect(deploy, "keeper planned no deploy").toBeTruthy();
    await send(KEEPER, deploy!.req);
    const line1 = await calls.readLine(c);
    expect(line1.loans[0].side, "absorber not at the front").toBe("absorber");
    expect(line1.absorberDebt).toBeGreaterThan(2_000);

    // 3. Bob opens a protected loan behind the absorbers.
    const quote = math.quoteBorrow({ collateralBtc: 0.1, borrowMusd: 4_000 }, { btcPrice: line1.btcPrice, loans: line1.loans, absorberDebt: line1.absorberDebt, protectedDebt: line1.protectedDebt });
    expect(quote.allowed, quote.warnings.map((w) => w.message).join("; ")).toBe(true);
    await sendAll(BOB.address, await calls.buildOpenLoan(c, { collateralBtc: 0.1, borrowMusd: 4_000 }));
    const loan = await calls.readLoan(c, BOB.address);
    expect(loan?.status, "loan not protected").toBe("protected");
    expect(loan!.guaranteedBuffer).toBeGreaterThan(2_000);

    // 4. A redeemer gets MUSD and redeems: the absorber pays, Bob does not move.
    const redeemerDebt = 3_000n * WAD;
    const [up, low] = await calls.insertHints(c, 1n * WAD, redeemerDebt + 300n * WAD);
    await send(REDEEMER.address, { to: M.borrowerOperations, value: WAD, label: "redeemer trove", data: encodeFunctionData({ abi: boAbi, functionName: "openTrove", args: [redeemerDebt, up, low] }) });
    const preview = math.previewRedemption(400, (await calls.readLine(c)).loans, Number(price) / 1e18);
    expect(preview.touchesOtherLoans, "redemption would reach other loans").toBe(false);
    expect(preview.fromProtected).toBe(0);
    await sendAll(REDEEMER.address, await calls.buildRedeem(c, 400));
    const after = await calls.readLoan(c, BOB.address);
    expect(after!.collateralBtc).toBe(loan!.collateralBtc);
    expect(after!.totalDebt).toBeCloseTo(loan!.totalDebt, 0);
    const activity = await calls.readActivity(c);
    expect(activity.some((a) => a.kind === "redemption"), "redemption missing from activity").toBe(true);

    // 5. Bob repays 500 MUSD (approve, then repay: two transactions).
    const repay = await calls.buildAdjust(c, BOB.address, { kind: "repay", musd: 500 });
    expect(repay.map((r) => r.label)).toEqual(["Approve MUSD", "Repay"]);
    await sendAll(BOB.address, repay);
    expect((await calls.readLoan(c, BOB.address))!.totalDebt).toBeLessThan(after!.totalDebt - 499);

    // 6. A month later the keeper collects Bob's premium for the absorbers.
    await test.increaseTime({ seconds: 30 * 24 * 3600 });
    await test.mine({ blocks: 1 });
    const navBefore = await c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "totalAssets" });
    const collect = (await planKeeper(c)).find((s) => s.action === "collectPremium");
    expect(collect, "keeper planned no premium collection").toBeTruthy();
    await send(KEEPER, collect!.req);
    const navAfter = await c.readContract({ address: F.absorberVault, abi: absorberVaultAbi, functionName: "totalAssets" });
    expect(navAfter).toBeGreaterThan(navBefore);

    // 7. Alice withdraws half her shares and receives BTC.
    const pos = await calls.readAbsorber(c, ALICE.address);
    const btcBefore = await c.getBalance({ address: ALICE.address });
    await sendAll(ALICE.address, await calls.buildWithdraw(c, ALICE.address, pos!.shares / 2));
    expect(await c.getBalance({ address: ALICE.address })).toBeGreaterThan(btcBefore);
    expect((await calls.readAbsorber(c, ALICE.address))!.shares).toBeCloseTo(pos!.shares / 2, 3);

    const vault = await calls.readVault(c);
    console.log("end state:", { absorberDebt: vault.absorberDebt, protectedDebt: vault.protectedDebt, coverage: vault.coverage, premiumRate: vault.premiumRate, sharePrice: vault.sharePrice, redeemed7d: vault.redeemedLast7d });
  }, 900_000);
});
