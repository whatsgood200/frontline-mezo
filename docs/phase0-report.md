# Phase 0 report: Mezo Buildathon, Wave 2

Written 2026-11-05. Sources: the AKINDO event page and its public API (Wave 1 scores, judge comments, Wave 2 entries, saved in `docs/research/`), and the full Mezo docs mirror in `docs/research/mezo-docs/`. Chain facts: `../../_chains/MEZO.md`.

## 1. What judges really score

The Mezo core team scores every screened entry 0 to 10 per criterion and writes a paragraph of feedback. Wave 1 feedback shows a fixed method:

- **Integration ladder.** L3 reads Mezo state in a protocol-aware way. L4 has our own contracts acting on Mezo primitives on chain (BorrowerOperations, veBTC, BoostVoter, Pools). L5 composes several of them so MUSD gets a new job or new demand, exercised on chain from the product (not deploy scripts) by outside wallets, ideally on mainnet. Nobody reached 10 without composition plus on-chain proof.
- **They read the code.** Judges found real bugs: double-counted pending interest in `getEntireDebtAndColl`, Recovery Mode mis-modelled, `maxBorrowingCapacity` ignored, front-runnable signatures, owner keys that can redirect rewards. One High finding caps Technical at 4.
- **They check claims.** Explorer verification, which contract revision is deployed, whether transactions were sent by the app or a script, whether test counts in the text match the repo, whether links open.
- **Materials is mechanical.** No public deck, or a private or broken video, caps Materials at 2. A video over about 2:15 loses points. Missing track, team or status fields cost points.
- **Product asks the same three things every time:** who pays and how much (a revenue model), evidence of outside users, and how this extends an existing Mezo product.

## 2. Where the points are

| Criterion | Weight | What earns it | What loses it |
|---|---|---|---|
| Mezo Integration | 30% | Our contracts compose 2 or more Mezo primitives (troves, sMUSD, Pools, veBTC/veMEZO, gauges, PriceFeed) so MUSD gets a new use; transactions sent from the app; outside wallets | Reads only; "link out to mezo.org to borrow"; a generic ERC-20 flow that would run unchanged on USDC |
| Product & Business Viability | 30% | Extends an existing Mezo product, named user, priced fee, outside users with explorer links | No revenue model, team-only wallets, standalone app |
| Technical Implementation | 20% | Verified contracts, correct MUSD edge cases (Recovery Mode, redemptions, min debt, borrowing capacity, pending redistribution), fuzz tests, no admin rug paths | One High finding, unverified source, README drift |
| User Experience | 10% | Fast-loading app, wallet flows that work, risk shown before signing | Headless browser timing out, intro screens |
| Submission Materials | 10% | Public deck, video under 2:00 showing a real on-chain flow, every form field | Missing deck (capped at 2), long video |

## 3. Disqualification and payout risks

| Risk | Rule | Our handling |
|---|---|---|
| No MUSD/MEZO integration | Mandatory | MUSD is the core of the product |
| No working deployment | Mezo testnet or mainnet, Ethereum, Base, BNB | Testnet deploy by day 4, mainnet proof with tiny amounts if the plan needs it |
| Old work | Built during the hackathon or a new extension | Fresh repo started 2026-11-05 |
| Reused code | Must be open source and cited | README credits section (OpenZeppelin, Mezo interfaces, any forks) |
| Wrong deadline | Text says 15 Nov, platform says 13 Nov 05:30 UTC | Use 13 Nov; submit 12 Nov |
| Jurisdiction | Prohibited list | Nigeria is not on it |
| KYB | W9 or W8-BEN, ID, proof of address, wallet | Right prepares documents in advance |
| One team per wave | Rule | Solo entry |
| AI disclosure | Not required by the rules | Disclose anyway in the README, as Wave 1 entries did |

## 4. Submission checklist

- [ ] Live testnet or mainnet URL that loads fast in a private window
- [ ] Public GitHub repo with README (problem, user, how MUSD is used, contract addresses with explorer links, architecture, tests, what is and is not proven)
- [ ] Contracts verified on the Mezo explorer
- [ ] Public deck (PDF in repo plus link), 7 to 10 slides
- [ ] Pitch video under 2:00, public or unlisted, captioned, showing a real on-chain flow from the app
- [ ] AKINDO form: name, category (3 to 5 words), TL;DR, how it works, target group, tech stack, track(s), chain, status "entirely new", readiness, next three milestones with dates, team and roles with X or LinkedIn
- [ ] Outside wallets that used the product, listed with explorer links
- [ ] Revenue model stated with numbers
- [ ] Right submits on 12 Nov after confirming every field

## 5. What to skip

- **Liquidation alerts and trove guards.** At least 12 entries (Vigil, Lifeline, Bulwark, Lockwatch, Trove Guardian, AgentVault, Tripwire, MUSD Guardian, KEEL, BALLAST, Pylon, Liqvera).
- **Payment links, invoices, checkout, splits, subscriptions.** About 15 entries, mostly scored L3 to L4.
- **Agent payments and x402.** About 10 entries (Sternpost, BanQor, Mezo Agent Toolkit, AgentFeed, paywall, Relayguard, Agentfloat, Witness, mezodot, ProMeo). Mezo already ships an x402 guide.
- **veBTC-as-collateral loans and boost markets.** These are the Wave 1 winners' ground (Doji, Surety, Keel, Latch, thaw for loans; Janus, Torque, Boost Relay for boost, plus Matchbox live on mainnet). We would be a late copy.
- **Small-loan pooling.** TinyVault, Microtrove, Spend, Feasy already work around the 1,800 MUSD minimum.
- **One-click leverage loops.** Coil (two of them), Pylon, Mezodot.
- **Thin multi-chain stacking.** One deep Mezo composition beats a logo on three chains.

## 6. What past winners did (Wave 1 top 5 and the high scorers)

| Project | $ | Score I/P/T/U/S | What it does | Lesson |
|---|---|---|---|---|
| Doji | 80 | 10/8/8/8/8 | Fixed-rate, fixed-date MUSD loans against veBTC, with lender credit units and protected auctions | Opens with Mezo's own FAQ ("Can I use my locked BTC as collateral? No.") and a Mezo blog post. A "try to break it" page runs 12 attacks against the live contracts |
| Surety | 73 | 8/8/8/6/8 | veBTC holders direct MUSD credit and take first loss | Puts the ve system to work as a credit market |
| Janus | 69 | 8/8/8/8/2 | Boost market: buy veMEZO votes for veBTC boost | Lost Materials points for having no deck |
| Keel | 69 | 8/8/8/8/2 | Borrow against BTC without being redeemed | Targets a pain specific to MUSD (redemptions) |
| Mezonk | 69 | 8/8/8/8/2 | Prediction market funded by borrowing against BTC | Real troves opened from the app |
| mbLP | 22 | 10/8/8/8/8 | One deposit: open trove, LP BTC/MUSD, stake in gauge, recycle fees as bribes | Same score as Doji, much less money. The payout is the judges' call, not a strict share of points |
| Baserate | 20 | 10/8/8/8/2 | First MUSD market on Mezo's Morpho Blue | "Deepest integration we saw", let down by materials |

Patterns: the first two sentences name a Mezo-specific limit or pain, with a Mezo source. Top entries compose the ve system or the trove system with a second primitive. Every winner still had only team wallets, and judges asked all of them for outside users. That gap is open to us: Right can bring real people onto testnet.

## 7. Candidate directions for Phase 1

Every candidate was checked against all 135 Wave 1 entries and the 13 Wave 2 entries so far.

**A. Self-repaying MUSD loan (recommended, subject to a yield check).** A per-user vault takes BTC. Part goes in as trove collateral and MUSD is borrowed to the user; the rest is locked as veBTC that votes on the MUSD pools. Each epoch a keeper claims veBTC fees and incentives, swaps them to MUSD on Mezo Pools, and calls `repayMUSD` on the user's trove. The debt shrinks without the user doing anything, and every harvest buys MUSD on market, which supports the peg. This composes BorrowerOperations, veBTC, the VeBTC voter and reward contracts, the Pools router and PriceFeed, and gives veBTC yield a new job: paying down MUSD debt. Competition: "thaw" had the one-line idea and scored 0 with nothing shipped; Feasy pays sMUSD yield in BTC; Doji passes rewards to the borrower but does not repay with them. Main risk: veBTC yield must be a real fraction of the 1 to 5% fixed MUSD rate, and testnet reward flows may be thin. Spike 1 (1 hour): read mainnet veBTC fee and incentive APR and the current MUSD rate, then model the payoff time.

**B. MUSD money market on Base.** A Morpho Blue market on Base that lends bridged MUSD (Wormhole NTT) against cbBTC, with a curated vault and a carry router: borrow at a fixed 1 to 5% on Mezo, bridge, supply on Base. Wave 1 judges asked MUSD Reach for exactly this ("stand up a real market on Base"). Competition: Beam (0 points), MUSD Reach ($17), Mezodot ($19), and an official Morpho aMUSD vault already on Ethereum. Risks: NTT has no testnet route, so this means mainnet with real funds; liquidity has to be bootstrapped; much of the work is market configuration, which judges may score as thin.

**C. Track 2 with real users: rotating savings (ajo/esusu) for Nigerian savers, with the pot in sMUSD and BTC-backed early payout.** Right is in Lagos and can bring real outside users, which no Wave 1 winner had. Competition: AjoCircle ($15, I4), Round ($12), Owo ($18, naira payouts). Risk: savings flows top out around integration L4, and the 2,000 MUSD minimum debt makes the borrow leg unrealistic for most members.

**Recommendation: A**, if the spike shows payoff within a few years at mainnet yields. If it does not, fall back to B. Whichever we pick, plan from day 1 to get 10 to 20 outside wallets through the product on testnet.

## 8. Strategy notes for Right

- **Prize size.** Wave 1 paid the top 5 $69 to $80 each from $2,000. At the same shape, Wave 2's $5,000 pays a top finish roughly $170 to $220 in MEZO, after KYB. The value is mostly portfolio, Mezo team contact, and ecosystem grants after the event (Supernormal Foundation).
- **Time clash.** NEAR HACKATHON (Verdict) closes on 14 Nov, one day after this. Both cannot get full attention in the same week. Decide which one comes first.
- **Head start.** None of the top Wave 1 teams has resubmitted yet. When they do, they will bring two weeks of work plus written judge feedback. Our edge has to be outside users, a clean security story and complete materials.
- **Discord questions to ask early:** (1) Is the Wave 2 deadline 13 Nov 05:30 UTC or 15 Nov? (2) Can a submission be edited after sending? (3) Is there a testnet veBTC reward and incentive flow every epoch? (4) Is there a testnet MUSD route on Wormhole NTT?
