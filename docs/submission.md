# AKINDO submission draft (Mezo Buildathon, Wave 2)

Draft for Right to confirm field by field before submitting on 12 Nov. Bracketed items need Right's input. Every claim here matches the README; re-check the numbers on submission day.

## Project name
Frontline

## Category (3 to 5 words)
Redemption protection for MUSD

## TL;DR (one sentence)
Frontline lets Mezo borrowers pay BTC holders to stand in front of them in MUSD’s redemption line, so redemptions keep defending the peg without selling the protected borrower’s BTC.

## How it works

**Problem.** On Mezo mainnet, redemptions hit MUSD loans 1,310 times against 28 liquidations. 1,176 redemptions took 78.9 BTC from 189 borrowers, and only 3 loans remain open. MUSD trades at $0.990, so buying it and redeeming at $1 minus the 0.75% fee is a standing trade against the weakest loan. Borrowers respond by leaving: Mezo Borrow TVL fell 63% in about 60 days.

**What Frontline does.** MUSD’s TroveManager always redeems the loan with the lowest collateral ratio first, and nobody can skip ahead. Frontline uses that rule instead of fighting it. An AbsorberVault takes BTC from absorbers and keeps its own MUSD loans at 112 to 115%, at the front of the line. Protected borrowers open their loans through Frontline at 150% or more, behind the absorbers, and pay a premium of 0.5 to 3% a year that goes to absorbers. When a redemption arrives it reaches the absorber loans first: absorbers turn part of their BTC into MUSD at the oracle price, with no loss in dollars, and the protected loan is untouched.

**How MUSD and MEZO are used.** Frontline is built on MUSD’s own contracts. Our vault and loan contracts own real troves through BorrowerOperations (open, adjust, repay, borrow, close, claim collateral). Redemptions run through TroveManager’s redeemCollateral unchanged. FrontlineLens reads the live SortedTroves list; every write carries HintHelpers insert hints; every price comes from MUSD’s PriceFeed; surplus BTC is reclaimed from CollSurplusPool. Wallets connect through Mezo Passport, including Bitcoin wallets. Every Frontline loan pays Mezo’s 1% interest and 0.1% borrowing fee, so Frontline creates trove demand for Mezo Borrow instead of moving borrowers to another market.

**Positioning.** Liquity v2 solved the same problem by letting borrowers pay for their place in the redemption order. MUSD cannot change its core, so Frontline builds that market on top of it.

## Target group
BTC holders with 0.05 to 2 BTC who want dollars at Mezo’s 1% fixed rate without having their BTC sold at $1 per MUSD; and BTC holders willing to convert part of their BTC to dollars at the oracle price in return for a premium (absorbers).

## Tech stack
Solidity 0.8.28, Foundry (unit, fuzz and fork tests against the real MUSD contracts), OpenZeppelin 5 (Clones, ReentrancyGuard, Ownable2Step, ERC20); Next.js 15, React 19, viem, wagmi, RainbowKit, Mezo Passport; Vitest; Vercel; GitHub Actions for CI and the keeper.

## Track(s)
Track 1: DeFi (primary). Track 2: Access and Distribution (secondary).

## Chain
Mezo testnet (chain 31611).

## Project status
New (built during Wave 2).

## Readiness
Testnet. Contracts deployed and source-verified on the Mezo testnet explorer; live app at https://frontline-mezo.vercel.app.

## Next three milestones
1. By 12 Nov 2026: a live redemption through the app on Mezo testnet, and ten or more outside wallets borrowing and absorbing.
2. December 2026: capped mainnet launch after an external review, with a 120 to 130% band and a public keeper.
3. Q1 2027: a protocol share of the premium as revenue, absorber MUSD earning in sMUSD, and a Mezo Earn gauge for the vault.

## Team members and roles
Righteous Oyewole: solo builder (smart contracts, keeper, web app, design).

## Links
- Live app: https://frontline-mezo.vercel.app
- Repo: https://github.com/whatsgood200/frontline-mezo
- Deck: [public deck link or PDF in the repo]
- Video: [unlisted YouTube link, under 2:00]
- X: [@handle]
- LinkedIn: [profile URL]

## Contract addresses (Mezo testnet)
- AbsorberVault: 0x0CD16Bb4d327e2bA0947deE279073cEc2E0DA265
- ProtectedLoanFactory: 0xD8f888161FAcB6529e9389B2b1b9E3Df2636957e
- FrontlineLens: 0x943d4252c759249D24D375E855B0a3caf13DB874

## Honest limits to state if asked
- The hero redemption is recorded on a local fork of Mezo testnet with the real contracts. On testnet, other teams’ loans at 110 to 112% sit in front of any absorber, and we do not redeem other people’s loans.
- Unaudited testnet software. A self-review found and fixed one High and two Medium issues (docs/security.md).
- Today every premium goes to absorbers; the protocol share is a planned milestone.
