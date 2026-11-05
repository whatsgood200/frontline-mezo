import { createPublicClient, http, type PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { mezoTestnet } from "../mezo";
import { readActivity, readLine, readVault, readLoan, readAbsorber } from "./chain-calls";
import { FRONTLINE_ADDRESSES } from "./addresses";
import { planKeeper } from "./keeper";

// Live smoke test against Mezo testnet and Frontline's deployed contracts.
// Run with: LIVE=1 pnpm test chain.live
const live = process.env.LIVE === "1";
const c = createPublicClient({ chain: mezoTestnet, transport: http(undefined, { batch: true, timeout: 20_000 }) }) as PublicClient;

describe.skipIf(!live)("live reads on Mezo testnet", () => {
  it("reads the redemption line through FrontlineLens", async () => {
    const line = await readLine(c);
    expect(line.frontlineLive).toBe(true);
    expect(line.totalLoans).toBeGreaterThan(100);
    expect(line.loans.length).toBeGreaterThan(10);
    expect(line.btcPrice).toBeGreaterThan(1_000);
    expect(line.loans[0].redeemedBefore).toBe(0);
    console.log("front of line:", line.loans.slice(0, 3).map((l) => `${l.label} ${(l.ratio * 100).toFixed(1)}% ${l.debt.toFixed(0)}`));
  }, 60_000);

  it("reads the vault", async () => {
    const v = await readVault(c);
    expect(v.bandLow).toBeCloseTo(1.12, 5);
    expect(v.bandHigh).toBeCloseTo(1.15, 5);
    console.log("vault:", { absorberDebt: v.absorberDebt, protectedDebt: v.protectedDebt, nav: v.navMusd, sharePrice: v.sharePrice });
  }, 60_000);

  it("reports no loan and no position for an address that never used Frontline", async () => {
    const nobody = "0x000000000000000000000000000000000000dEaD";
    expect(await readLoan(c, nobody)).toBeNull();
    expect(await readAbsorber(c, nobody)).toBeNull();
  }, 60_000);

  it("reads activity and plans a keeper run", async () => {
    const items = await readActivity(c);
    expect(Array.isArray(items)).toBe(true);
    const steps = await planKeeper(c);
    console.log("keeper plan:", steps.map((s) => s.detail));
    expect(FRONTLINE_ADDRESSES.absorberTroves.length).toBe(2);
  }, 120_000);
});
