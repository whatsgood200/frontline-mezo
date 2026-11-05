# Phase 1 plan: Frontline (working name)

Written 2026-11-05. Research behind it: `docs/idea-research.md`. Architecture: `docs/architecture.md`. Decisions: `docs/decisions/`.

## 1. Five-question test

| Question | Answer |
|---|---|
| Who exactly has the problem? | BTC holders who borrow MUSD on Mezo Borrow, and the ones who left. 189 borrowers have been redeemed on mainnet; 3 loans remain open. |
| How painful is it? | 78.9 BTC taken through 1,176 redemptions. Each redemption is a forced sale of BTC at $1 per MUSD, a taxable event, and lost upside. Redemptions hit loans 47 times more often than liquidations (1,310 against 28). Mezo Borrow TVL is down 63% in about 60 days. |
| How do they cope today? | They leave: close the loan, move to Morpho mUSDC or another market (Keel, Baserate on testnet), or top up collateral and hope weaker loans sit in front of them. With 3 loans on mainnet there is nobody in front. |
| Our angle | Do not leave Mezo Borrow and do not disable redemptions. Put a paid layer of willing loans at the front of the redemption line, so redemptions keep defending the peg while protected borrowers are reached last. This is Liquity v2's paid redemption ordering, rebuilt on top of MUSD without touching its core. |
| Can we build a convincing version by 12 Nov? | Yes. Every mechanism uses public MUSD functions (openTrove, adjustTrove, repayMUSD, withdrawMUSD, claimCollateral, getNominalICR, SortedTroves). Testnet has 361 live loans, a 288% system ratio and no Recovery Mode, so the redemption line is real. |

## 2. Users, done statement, hero moment

- **Protected borrower:** holds 0.05 to 2 BTC, wants dollars at Mezo's 1% fixed rate, on a phone or laptop, and is afraid of being redeemed or has been.
- **Absorber:** holds BTC and is happy to have part of it turned into dollars at the oracle price (averaging out, funding runway), and wants to be paid while waiting.
- **Done statement:** A borrower can open a 1% MUSD loan on Mezo testnet through Frontline, see exactly how much MUSD must be redeemed before anyone reaches it, and watch a real redemption stop at the absorber layer while their BTC stays untouched. An absorber can deposit BTC and earn the protection premium.
- **Hero moment:** On the Redeem Lab page, someone redeems MUSD on testnet. The live line animates: the absorber loan shrinks, the protected loan does not move, and the explorer shows `TroveUpdated` only on the absorber proxy.
- **The system behind it:** MUSD's TroveManager redeems from the lowest nominal ratio upward (`redeemCollateral` walks `SortedTroves.getLast()` then `getPrev`, and `_isValidFirstRedemptionHint` stops anyone skipping ahead). The Absorber Vault keeps its loans in that front position. Protected loans are held above the absorber band by contract rules, and their premium streams to absorbers.

## 3. How the mechanism works (verified against MUSD source)

1. **Absorber Vault.** Absorbers deposit native BTC. The vault splits it across absorber loans, each a minimal proxy that owns one trove (Mezo allows one trove per address). It borrows to a target ratio band and **keeps all the MUSD it borrowed**. Because it holds that MUSD, any loan drifting toward 110% can be repaid at once, by the keeper or by anyone through a permissionless `protect()` call that pays a bounty.
2. **Line keeping.** The keeper keeps absorber loans at the lowest nominal ratio in the system, but not below a hard floor (111.5%). Testnet today has third-party loans at 116.4% and up, so the testnet band starts around 112 to 115%. Mainnet has 3 loans, so the band can sit at 120 to 130%. Band and floor are parameters with tight bounds.
3. **A redemption arrives.** MUSD takes `min(amount, debt - 200)` from the first loan. A full hit closes the loan by redemption, and the leftover BTC goes to CollSurplusPool for the vault to claim. A partial hit is cancelled if it would leave net debt under 1,800 MUSD, and then the whole redemption stops; that also protects loans behind it. A redemption is value-neutral at the oracle price: the vault loses BTC and the same dollar value of debt, and keeps its MUSD. Absorbers' exposure moves from BTC to dollars, which is the deal they took.
4. **Re-arm.** After a hit, the keeper reopens closed loans and borrows back to the band, rebuilding the buffer from the remaining BTC.
5. **Protected loans.** Each borrower gets a personal proxy that owns their trove. Only the owner can move collateral or debt. The contract refuses any action that would push the loan's nominal ratio below the protection floor, which sits above the absorber band plus a margin. The app shows the **buffer**: total redeemable MUSD in front of the loan, split into absorber buffer (guaranteed) and other loans (not guaranteed).
6. **Premium.** It accrues per second on protected debt at a rate set by a coverage curve (coverage = absorber redeemable debt / protected debt). Anyone can call `collectPremium(loan)`. It draws the premium as extra MUSD debt on the borrower's own trove (`withdrawMUSD` to the vault), just as interest adds to debt, so there are no weekly signatures. New protected debt is refused if it would push coverage under the minimum.
7. **Mezo gets fees back.** Absorber and protected loans pay Mezo's 1% interest and 0.1% borrowing fee. Those fees feed the sMUSD vault (now earning about 0%) and the bootstrap loan repayment. Frontline creates trove demand for Mezo Borrow instead of draining it.

## 4. Economics (shown honestly in the app's simulator)

Absorber yield on BTC ≈ (premium rate / coverage − 1% interest) / target ratio. At a 125% ratio:

| Premium paid by borrowers | Coverage | Absorber net on debt | Absorber yield on BTC | Borrower total cost |
|---|---|---|---|---|
| 1.0% | 0.25 | 3.0% | 2.4% | 2.0% |
| 1.5% | 0.25 | 5.0% | 4.0% | 2.5% |
| 1.0% | 0.50 | 1.0% | 0.8% | 2.0% |
| 2.0% | 0.50 | 3.0% | 2.4% | 3.0% |

The benchmarks are veBTC at 1.59% for absorbers, and Morpho USDC borrowing at 5 to 7% elsewhere for borrowers. The model leaves out the one-off 0.1% borrowing fee and the 200 MUSD gas deposit per loan (returned on close). The open question is whether enough absorbers exist; Right's interviews test it.

## 5. MoSCoW

**Must (hero path, all real on testnet):**
- AbsorberVault: deposit and withdraw (pro-rata BTC plus MUSD), absorber proxies, band keeping, `protect()`, re-arm, surplus claim, NAV, all with events.
- ProtectedLoan factory and proxies: open with on-chain hints, add or withdraw BTC, borrow, repay, close, claim surplus, protection floor, premium accrual and collection.
- PremiumModel (coverage curve) and coverage cap.
- FrontlineLens: one call returns the redemption line (owner tag, ratio, debt, cumulative buffer) and per-loan buffer.
- App screens 1 to 7 (section 6) on Mezo Passport, phone first, all states.
- Keeper (rebalance, re-arm, collect premiums, protect) on a schedule, with a public log.
- Foundry unit, fuzz and invariant tests ("no protected loan is redeemed while absorber redeemable debt remains"), testnet fork tests, verified contracts.
- Mainnet analytics page from real events (1,176 redemptions, 78.9 BTC, 3 loans), cached server-side.
- README, deck, video under 2:00, 10 or more outside testnet wallets with explorer links.

**Should:**
- Auto top-up from a borrower-funded BTC reserve when the loan nears the protection floor.
- Telegram alert when coverage or a loan's buffer drops below a threshold.
- Absorber payoff simulator with live parameters.
- Recovery Mode detection: pause new loans, keep exits open.

**Could:**
- Migrate an existing EOA trove into a protected loan in one transaction (flash close and reopen through a Mezo pool flash swap).
- Mezo Earn gauge for the vault (needs Mezo to whitelist it).
- Capped mainnet deployment with a tiny absorber loan, if Right funds it (minimum 2,000 MUSD debt per loan).
- Absorber MUSD parked in sMUSD.

**Won't (this build):** changes to MUSD core, Morpho markets (not on testnet), veBTC collateral, cross-chain.

## 6. Main journey (numbered screens)

1. **Line** (public home): the problem in Mezo's own numbers, then the live redemption line for testnet and mainnet: every loan in order, absorber and protected loans tagged, buffer totals. Actions: "Borrow with protection", "Earn as an absorber".
2. **Borrow**: BTC amount and MUSD amount. Shows ratio, liquidation price, buffer in front, premium rate, total yearly cost, the 2,000 MUSD minimum and fees. Action: "Open protected loan".
3. **My loan**: health, buffer in front (guaranteed and other), premium accrued, protection status. Actions: add BTC, repay, borrow more, withdraw BTC, close, claim surplus.
4. **Absorb**: vault stats (band, loans, NAV, coverage, estimated yield) and the payoff simulator. Action: "Deposit BTC".
5. **My absorber position**: shares, value split into BTC and MUSD, premiums earned, BTC converted by redemptions. Action: withdraw.
6. **Redeem Lab** (hero): enter an MUSD amount, preview exactly which loans it would hit, run a real testnet redemption, and watch the line update.
7. **Proof**: every Frontline transaction with explorer links, keeper log, contract addresses, mainnet redemption analytics.

## 7. Riskiest unknowns and fallbacks (Phase 1b spikes, about 1 hour each)

| # | Unknown | Spike | Fallback |
|---|---|---|---|
| S1 | A proxy contract can open, adjust and close a trove on testnet, with hints and sane gas (Keel saw bad estimates) | Deploy a minimal proxy and run open, repay, close | Borrowers keep their own EOA trove, and Frontline acts through `BorrowerOperationsSignatures` |
| S2 | Redemption order and the partial-cancel rule behave as the code says on testnet | Two of our loans at different ratios, redeem, read events | None needed if S2 passes; if not, the idea fails and we stop before UI |
| S3 | Enough testnet BTC and MUSD for loans with a 2,000 MUSD minimum (about 0.03 BTC for an absorber loan, about 0.05 BTC for a protected one) | Right requests faucet funds; we measure what one request gives | Ask in Mezo Discord for a larger grant; reduce to one absorber and two protected loans |
| S4 | Our redemptions must not hit other teams' demo loans | Lens simulation before every redemption; absorber band under the lowest third-party loan | Run demo redemptions only when the preview shows our loans only |
| S5 | Absorber loans near 110% survive BTC moves | Fork test with price shocks; `protect()` repays from held MUSD | Raise the floor and accept a smaller testnet gap |

## 8. Timeline (deadline 13 Nov 05:30 UTC; we submit 12 Nov)

| Day | Work | Gate |
|---|---|---|
| Thu 5 Nov | Plan (this). Right: faucet, Discord, interviews | Plan approved |
| Fri 6 Nov | Spikes S1 to S5 in parallel; skeleton deployed (Next.js, Passport, CI, health); 2 or 3 design directions for the Line screen | Right picks a direction |
| Sat 7 Nov | All 7 screens on the mock adapter, all states, phone first | UI approved |
| Sun 8 Nov | Contracts and tests; testnet deploy and verify | Tests green, verified |
| Mon 9 Nov | Connect adapter functions one by one; hero path real on the deployed URL | Hero real |
| Tue 10 Nov | Keeper, analytics, alerts, security pass, outside users onboarded; feature freeze at end of day | Freeze |
| Wed 11 Nov | Polish, README, deck, video, rehearsal | |
| Thu 12 Nov | Submit with every field confirmed by Right | Submitted |

## 9. What Right does (batched)

1. Request testnet BTC for a **new** deployer wallet at https://faucet.test.mezo.org (CAPTCHA), several times if allowed. Send me only the public address.
2. Join https://discord.mezo.org, ask for the Developer role, and post the questions in `docs/idea-research.md` section 7.
3. Ask 5 to 10 BTC holders the three interview questions (section 5 of the idea research) and paste the answers into `docs/interviews.md`.
4. Line up 10 or more people who will open a testnet wallet and try Borrow, Absorb or Redeem Lab on 10 Nov.
5. Decide whether NEAR or Mezo gets priority on 10 to 12 Nov.
