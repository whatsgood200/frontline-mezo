# Security notes

Living document. Updated 2026-11-06.

## Web app dependencies

- Next.js 15.5.29 and React 19.1.10 (latest patched backport; Vercel blocked 15.5.4 for a known vulnerability).
- `pnpm audit --prod` reports 46 advisories. **None come from code we ship to the browser.** Every one is inside Mezo's official Passport and OrangeKit packages:
  - `@mezo-org/passport > @mezo-org/mezo-clay` declares dev tooling as runtime dependencies: vitest, vite, esbuild, tinypool, storybook, vite-plugin-dts, baseui/d3. Frontline imports only Passport's wallet config (`@mezo-org/passport/dist/src/config`), never mezo-clay.
  - `@mezo-org/orangekit > @mezo-org/orangekit-smart-account > @safe-global/protocol-kit > web3 > web3-bzz > swarm-js` pulls tar, request, tough-cookie, qs, uuid, decode-uri-component. These are Node-only Swarm modules that no browser code path loads.
  - `orangekit > sats-connect > valibot` (moderate ReDoS in a schema helper).
  - `wagmi > @base-org/account > @coinbase/cdp-sdk > zod`: aliased to an empty module in `next.config.mjs`, so it is not bundled.
- We did not force overrides inside Passport's tree, because a wrong major version could break Bitcoin wallet signing. If Mezo publishes a Passport release with a cleaner tree, upgrade.

## Headers

`next.config.mjs` sets X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, HSTS and Permissions-Policy on every route. A Content-Security-Policy (added 2026-11-06) allows only the hosts the shipped bundle talks to: Mezo RPCs, WalletConnect, Web3Modal and Gelato (OrangeKit relay). `script-src` keeps `unsafe-inline` because Next.js inlines its bootstrap scripts and nonces would force dynamic rendering.

## Mock adapter

- Production refuses to start with `NEXT_PUBLIC_ADAPTER=mock` (`web/src/lib/env.ts`), and Vercel Production is set to `chain`.
- The demo wallet exists only on mock builds and signs nothing.

## Contracts (written 2026-11-05, unaudited)

Controls in place, each covered by a fork test against the real MUSD contracts (`contracts/test/fork/`):
- **No custody by the owner.** The vault owner can set the keeper, set the band inside hard bounds (111.5% to 160%), pause deposits, and set the loan registry once. No function moves user BTC or MUSD to the owner.
- **Reentrancy.** `nonReentrant` on every vault and loan entry point that calls MUSD or sends BTC. AbsorberTrove forwards funds to the vault and holds nothing between calls.
- **Access control.** AbsorberTrove: vault only. ProtectedLoan: owner only for collateral and debt; anyone may `collectPremium` (it only adds debt within the 150% floor and pays the vault). Vault: keeper or owner for `deploy` and `rebalance`; anyone for `protect` (only when a trove is under the band) and `claimSurplus`. `notifyPremium` only from registered loans.
- **Share accounting.** Virtual shares and assets (1e3 / 1) against first-depositor inflation; 21-decimal shares; minimum deposit 0.0001 BTC; zero-share deposits revert; withdrawal rounding favours the vault. Tests show later depositors get fair shares and a partial withdrawal leaves the share price unchanged (0.05% tolerance).
- **MUSD accounting.** Debt is `principal + interest` from `getEntireDebtAndColl`, which already includes pending redistribution (the double count a Wave 1 judge found elsewhere). Liabilities subtract the 200 MUSD gas deposit, which MUSD's GasPool repays on close.
- **Oracle.** All prices come from MUSD's own PriceFeed, the same price redemptions use, so a redemption is value-neutral for the vault.
- **Coverage cap.** The factory refuses new protected debt that would push coverage under 0.25x.

Known limits, stated plainly:
- A loan's premium for each period uses the lower of the vault's rate at the last accrual and its rate now. When coverage genuinely falls, borrowers pay the old, lower rate until the next accrual; the keeper collects often to keep that gap small.
- `totalProtectedDebt` updates on loan actions and on `ProtectedLoan.sync()`, which anyone may call; between calls it lags interest slightly.
- Free riders: any loan above the absorber band benefits without paying (decision in `docs/idea-research.md`).
- The last absorber out may need to bring a little MUSD to close troves (fees and interest not yet earned back); `withdraw` pulls it and refunds any excess.
- Absorbers lose value if the keeper deploys far beyond target coverage (decision 008).
- On testnet the band sits 2 to 5 points above MUSD's 110% liquidation line; a fast drop before `protect` runs could liquidate an absorber trove. Mainnet would use a wider band.
- `FrontlineLens.bufferAhead` walks at most 500 loans.

## Self-review, 2026-11-06

A line-by-line review of the five contracts before redeploying. Every fix has a fork test against the real MUSD contracts; all 36 contract tests pass.

| Severity | Finding | Fix | Test |
|---|---|---|---|
| High | After a redemption fully closes an absorber trove, its leftover BTC waits in MUSD's CollSurplusPool and was missing from NAV (12.3% of NAV in the test). Anyone could deposit at the low price, call the permissionless `claimSurplus`, and withdraw part of the absorbers' BTC; anyone withdrawing in that window lost their share of it. | NAV counts each trove's CollSurplusPool balance, and `withdraw` claims pending surplus before paying out. | `test_surplusAfterAFullRedemptionCountsInNav`, `test_nobodySnipesTheSurplusByDepositingBeforeTheClaim`, `test_withdrawalClaimsPendingSurplusFirst` |
| Medium | Premiums raised NAV the moment they were collected, and anyone can trigger a collection, so a deposit made just before it took premium earned before the depositor joined. | Premiums vest into NAV linearly over 3 days (`unvestedPremium`); withdrawals leave unvested premium to the holders who stay. | `test_premiumAccruesAndPaysAbsorbers`, `test_justInTimeDepositGetsNoPremiumEarnedBeforeIt` |
| Medium | A loan's premium for the whole elapsed period used the vault's rate at collection time. An absorber could briefly open a large protected loan to lower coverage, raise the rate, and collect from every other loan. | Each period is charged at the lower of the rate at the last accrual and the rate now. | `test_premiumUsesTheLowerRateSoItCannotBePumpedBeforeCollection` |
| Low | A redemption or liquidation that changes a protected loan's debt left the factory's total stale until the owner acted, which skews coverage and the premium. | `ProtectedLoan.sync()`, callable by anyone (the keeper can run it). | `test_anyoneResyncsAProtectedLoanDebt` |

Reviewed and left as is, stated plainly:
- Trust in the keeper: it chooses when and how much to deploy and rebalance. A malicious keeper cannot take funds, but repeated borrow-and-repay cycles would waste MUSD's 0.1% borrowing fee from absorbers' NAV. The owner can replace it.
- A partial withdrawal that forces a trove to close (its remainder would fall under MUSD's minimum debt) while the vault holds less MUSD than the debt reverts instead of settling the gap; the absorber can withdraw a different amount or everything.
- `collectPremium` is permissionless; spamming it only costs the caller gas, and the 0.1% borrowing fee on each draw is proportional to the premium.
- Deposits and withdrawals price BTC with MUSD's own oracle, the same price redemptions use; arbitrage around oracle updates is bounded by its update frequency.
