import { describe, expect, it } from "vitest";
import { absorberYieldOnBtc, bufferAhead, premiumRate, previewRedemption, quoteAbsorb, quoteBorrow, withRedeemedBefore } from "./math";
import { seedLine } from "./mock-data";
import type { LineLoan } from "./types";

const PRICE = 80_340;

describe("premium curve", () => {
  it("pays 1.25% at 0.35x coverage, the plan's worked example", () => {
    expect(premiumRate(0.35)).toBeCloseTo(0.01257, 4);
  });
  it("is bounded", () => {
    expect(premiumRate(10)).toBe(0.005);
    expect(premiumRate(0.01)).toBe(0.03);
    expect(premiumRate(0)).toBe(0.03);
  });
  it("gives absorbers about 2.1% on BTC at 0.35x", () => {
    expect(absorberYieldOnBtc(0.35)).toBeGreaterThan(0.02);
    expect(absorberYieldOnBtc(0.35)).toBeLessThan(0.022);
  });
});

describe("borrow quote", () => {
  const line = seedLine();
  const ctx = { btcPrice: PRICE, loans: line, absorberDebt: 42_180, protectedDebt: 120_500 };

  it("matches the statement example: 0.10 BTC, 4,000 MUSD", () => {
    const q = quoteBorrow({ collateralBtc: 0.1, borrowMusd: 4_000 }, ctx);
    expect(q.totalDebt).toBeCloseTo(4_204, 0);
    expect(q.ratio).toBeCloseTo(1.911, 2);
    expect(q.liquidationPrice).toBeCloseTo(46_244, -1);
    expect(q.allowed).toBe(true);
  });

  it("counts only loans in front of the borrower as buffer, without their gas deposits", () => {
    const q = quoteBorrow({ collateralBtc: 0.1, borrowMusd: 4_000 }, ctx);
    // 9 loans in front: 57,608 MUSD of debt minus 9 x 200 MUSD gas deposits.
    expect(q.guaranteedBuffer).toBe(41_780);
    expect(q.bufferAhead).toBe(55_808);
    expect(q.bufferIsMinimum).toBe(false);
  });

  it("refuses loans under Mezo's minimum debt", () => {
    const q = quoteBorrow({ collateralBtc: 1, borrowMusd: 1_000 }, ctx);
    expect(q.warnings.map((w) => w.code)).toContain("BELOW_MIN_DEBT");
    expect(q.allowed).toBe(false);
  });

  it("refuses loans that would sit inside the absorber layer", () => {
    const q = quoteBorrow({ collateralBtc: 0.06, borrowMusd: 4_000 }, ctx);
    expect(q.warnings.map((w) => w.code)).toContain("BELOW_PROTECTION_FLOOR");
  });

  it("refuses protected debt beyond the coverage cap", () => {
    const q = quoteBorrow({ collateralBtc: 10, borrowMusd: 100_000 }, ctx);
    expect(q.warnings.map((w) => w.code)).toContain("COVERAGE_CAP");
  });
});

describe("redemption preview (TroveManager order)", () => {
  const line = seedLine();

  it("a 30,000 MUSD redemption takes only from absorbers", () => {
    const p = previewRedemption(30_000, line, PRICE);
    expect(p.fromAbsorbers).toBe(30_000);
    expect(p.fromProtected).toBe(0);
    expect(p.fromOthers).toBe(0);
    expect(p.stopsAt).toBe("Absorber loan 2");
  });

  it("each loan gives at most debt minus the 200 MUSD gas deposit", () => {
    const p = previewRedemption(23_800, line, PRICE);
    expect(p.steps[0].taken).toBe(23_800);
    expect(p.stopsAt).toBe("Absorber loan 1");
  });

  it("stops the whole redemption when a partial would break the minimum", () => {
    // Absorber 1 gives 23,800; absorber 2 (18,180 debt) cannot drop to 1,000 net.
    const p = previewRedemption(23_800 + 17_000, line, PRICE);
    expect(p.steps.at(-1)?.taken).toBe(0);
    expect(p.fromAbsorbers).toBe(23_800);
  });

  it("flags redemptions that would reach other teams' loans", () => {
    const p = previewRedemption(60_000, line, PRICE);
    expect(p.touchesOtherLoans).toBe(true);
  });

  it("charges the 0.75% redemption fee in BTC", () => {
    const p = previewRedemption(10_000, line, PRICE);
    expect(p.redemptionFeeBtc).toBeCloseTo((10_000 / PRICE) * 0.0075, 8);
  });

  it("skips loans under 110%", () => {
    const underwater: LineLoan[] = withRedeemedBefore([
      { address: "0x0000000000000000000000000000000000000001", label: "under", side: "other", ratio: 1.05, debt: 5_000 },
      { address: "0x0000000000000000000000000000000000000002", label: "absorber", side: "absorber", ratio: 1.13, debt: 10_000 },
    ]);
    const p = previewRedemption(1_000, underwater, PRICE);
    expect(p.steps[0].label).toBe("absorber");
  });
});

describe("absorb quote", () => {
  it("matches the statement example: 0.50 BTC backs about 32,136 MUSD", () => {
    const q = quoteAbsorb(0.5, { btcPrice: PRICE, absorberDebt: 42_180, protectedDebt: 120_500, sharePrice: 1 });
    expect(q.debtBacked).toBeCloseTo(32_136, 0);
  });
});

describe("absorber ratio", () => {
  it("sizes absorber debt and yield at the ratio the vault really uses", () => {
    const ctx = { btcPrice: PRICE, absorberDebt: 42_180, protectedDebt: 120_500, sharePrice: 1 };
    const testnet = quoteAbsorb(0.5, { ...ctx, absorberRatio: 1.135 });
    expect(testnet.absorberRatio).toBe(1.135);
    expect(testnet.debtBacked).toBeCloseTo((0.5 * PRICE) / 1.135, 6);
    expect(testnet.netYieldOnBtc).toBeCloseTo(absorberYieldOnBtc(testnet.coverageAfter, 1.135), 12);
    // Lower ratio: more debt per BTC, so more yield on the same BTC.
    expect(absorberYieldOnBtc(0.35, 1.135)).toBeGreaterThan(absorberYieldOnBtc(0.35));
  });
});

describe("buffer", () => {
  it("is zero for a loan at the very front", () => {
    expect(bufferAhead(seedLine(), 1.0).total).toBe(0);
  });

  it("counts only redeemable debt: the 200 MUSD gas deposit is never redeemed (matches FrontlineLens.bufferAhead)", () => {
    const loans = seedLine().slice(0, 2);
    const expected = loans.reduce((s, l) => s + l.debt - 200, 0);
    expect(bufferAhead(loans, 99).total).toBe(expected);
  });

  it("says when the loaded part of the line ends before the borrower's ratio", () => {
    const line = seedLine();
    const ctx = { btcPrice: PRICE, loans: line.slice(0, 3), absorberDebt: 42_180, protectedDebt: 120_500 };
    const deep = quoteBorrow({ collateralBtc: 0.2, borrowMusd: 4_000 }, { ...ctx, totalLoans: 362 });
    expect(deep.bufferIsMinimum).toBe(true);
    const whole = quoteBorrow({ collateralBtc: 0.2, borrowMusd: 4_000 }, { ...ctx, totalLoans: 3 });
    expect(whole.bufferIsMinimum).toBe(false);
  });
});
