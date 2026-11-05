import type { ActivityItem, KeeperRun, LineLoan } from "./types";
import { withRedeemedBefore } from "./math";

// Phase 2 seed data. The seven "other" loans are real Mezo testnet troves read on
// 2026-11-05 (block 16,587,996) in redemption order. Absorber and protected loans
// and all activity are example values until the Frontline contracts are deployed.

export const MOCK_BTC_PRICE = 80_340;
export const MOCK_BLOCK = 16_587_996;

/** A valid, obviously synthetic address: the hex tag padded with zeros. */
export function exampleAddress(tag: string): `0x${string}` {
  if (!/^[0-9a-fA-F]{1,40}$/.test(tag)) throw new Error(`bad example tag ${tag}`);
  return `0x${tag.padEnd(40, "0")}`;
}

/** A valid, obviously synthetic tx hash. */
export function exampleHash(tag: string): `0x${string}` {
  if (!/^[0-9a-f]{1,64}$/.test(tag)) throw new Error(`bad example tag ${tag}`);
  return `0x${tag.repeat(Math.ceil(64 / tag.length)).slice(0, 64)}`;
}

type Seed = Omit<LineLoan, "redeemedBefore" | "position">;

export const ABSORBER_SEED: Seed[] = [
  { address: exampleAddress("a6b2a01"), label: "Absorber loan 1", side: "absorber", ratio: 1.132, debt: 24_000 },
  { address: exampleAddress("a6b2a02"), label: "Absorber loan 2", side: "absorber", ratio: 1.139, debt: 18_180 },
];

export const OTHER_SEED: Seed[] = [
  { address: "0x4C6165286739696849Fb3e77A16b0639D762c5B6", label: "0x4C61…c5B6", side: "other", ratio: 1.164, debt: 2_002 },
  { address: "0x155c4E84D2936bEBF3b90f667466e61b9655c92C", label: "0x155c…c92C", side: "other", ratio: 1.165, debt: 2_003 },
  { address: "0x68833F0c0e6d3E0B21805627867B86157572C013", label: "0x6883…C013", side: "other", ratio: 1.175, debt: 2_002 },
  { address: "0x3a02A1f0E556420cF7e0626286B29C8D63Ae47Cb", label: "0x3a02…47Cb", side: "other", ratio: 1.178, debt: 3_404 },
  { address: "0x935349725aDd49A855669AD4a9f9D6dA54ffA5F6", label: "0x9353…A5F6", side: "other", ratio: 1.203, debt: 2_004 },
  { address: "0x9B69f85FEda15a6f2A830A05dFd363339F75e83f", label: "0x9B69…e83f", side: "other", ratio: 1.199, debt: 2_011 },
  { address: "0xE741dE071fe801913A2f4Fbc53bC4DCcfF422F89", label: "0xE741…2F89", side: "other", ratio: 1.204, debt: 2_002 },
];

export const PROTECTED_SEED: Seed[] = [
  { address: exampleAddress("7ae1c09d2"), label: "Protected loan 0x7aE1", side: "protected", ratio: 1.86, debt: 48_500 },
  { address: exampleAddress("c3b9d41af"), label: "Protected loan 0xC3b9", side: "protected", ratio: 2.124, debt: 72_000 },
];

export function seedLine(): LineLoan[] {
  return withRedeemedBefore([...ABSORBER_SEED, ...OTHER_SEED, ...PROTECTED_SEED]);
}

const KEEPER = exampleAddress("9c1de1");
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function seedActivity(): ActivityItem[] {
  return [
    { hash: exampleHash("5e1c9a"), kind: "redemption", summary: "3,120 MUSD redeemed. Absorber loan 1 gave 0.0388 BTC; protected loans untouched.", account: exampleAddress("2f0b3e"), at: ago(42), block: MOCK_BLOCK - 690 },
    { hash: exampleHash("8a7b6c"), kind: "rearm", summary: "Absorber loan 1 borrowed back to 113.2%.", account: KEEPER, at: ago(38), block: MOCK_BLOCK - 630 },
    { hash: exampleHash("1b2c3d"), kind: "premium", summary: "Premium collected: 41.62 MUSD from 2 protected loans.", account: KEEPER, at: ago(180), block: MOCK_BLOCK - 3_000 },
    { hash: exampleHash("c0ffee"), kind: "open", summary: "Protected loan opened: 0.42 BTC, 18,000 MUSD at 186%.", account: exampleAddress("7ae1c09d2"), at: ago(320), block: MOCK_BLOCK - 5_350 },
    { hash: exampleHash("de4dbe"), kind: "deposit", summary: "Absorber deposit: 0.30 BTC.", account: exampleAddress("51ac4b7e"), at: ago(610), block: MOCK_BLOCK - 10_200 },
  ];
}

export function seedKeeper(): KeeperRun[] {
  return [
    { at: ago(4), action: "noop", detail: "All absorber loans inside 112 to 115%. Nothing to do.", hash: null },
    { at: ago(38), action: "rearm", detail: "Absorber loan 1 reopened after a 3,120 MUSD redemption.", hash: exampleHash("8a7b6c") },
    { at: ago(180), action: "collectPremium", detail: "Collected 41.62 MUSD from 2 protected loans.", hash: exampleHash("1b2c3d") },
    { at: ago(260), action: "rebalance", detail: "Absorber loan 2 repaid 410 MUSD after BTC fell 0.9%.", hash: exampleHash("0a1b2c") },
  ];
}
