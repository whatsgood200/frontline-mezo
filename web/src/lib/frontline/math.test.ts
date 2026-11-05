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

  it("counts only loans in front of the borrower as buffer", () => {
    const q = quoteBorrow({ collateralBtc: 0.1, borrowMusd: 4_000 }, ctx);
    expect(q.guaranteedBuffer).toBe(42_180);
    expect(q.bufferAhead).toBe(57_608);
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

describe("buffer", () => {
  it("is zero for a loan at the very front", () => {
    expect(bufferAhead(seedLine(), 1.0).total).toBe(0);
  });
});
