import { describe, expect, it } from "vitest";
import { blockRanges } from "./log-ranges";

// Mezo testnet's RPC refuses eth_getLogs spans over 10,000 blocks ("maximum [from, to] blocks distance").
describe("blockRanges", () => {
  it("covers every block once, in windows no wider than the span", () => {
    const r = blockRanges(16_591_000n, 16_612_345n, 9_000n);
    expect(r[0][0]).toBe(16_591_000n);
    expect(r.at(-1)![1]).toBe(16_612_345n);
    for (const [from, to] of r) expect(to - from).toBeLessThanOrEqual(9_000n);
    for (let i = 1; i < r.length; i++) expect(r[i][0]).toBe(r[i - 1][1] + 1n);
  });

  it("returns one window for a short span and none before the start", () => {
    expect(blockRanges(100n, 150n, 9_000n)).toEqual([[100n, 150n]]);
    expect(blockRanges(100n, 99n, 9_000n)).toEqual([]);
  });
});
