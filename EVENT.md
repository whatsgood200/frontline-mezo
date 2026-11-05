# EVENT.md: Frontline (working name) at Mezo Buildathon, Wave 2

Read at the start of every session. On event facts and scoring this file overrides AGENTS.md. Chain notes: `../_chains/MEZO.md`. Phase 0 report: `docs/phase0-report.md`. Idea research: `docs/idea-research.md`. Plan: `docs/plan.md`. Architecture: `docs/architecture.md`. Decisions: `docs/decisions/`. Raw research: `docs/research/` (local only, gitignored: Wave 1 scores and judge feedback, Wave 2 entries, Mezo docs mirror, cloned rival repos).

Folder is `2026-11-mezo-buildathon` until the project has a name; rename it then.

## Status
- [x] Phase 0 Decode and research (2026-11-05)
- [x] Phase 1 Plan approved by Right (gate) (2026-11-05)
- [ ] Phase 1b Spikes passed, skeleton deployed
- [ ] Phase 2 UI and full flow on mocks approved by Right (gate)
- [ ] Phase 3 Contracts and backend tested, deployed, verified (gate)
- [ ] Phase 4 Connected: hero path real on the deployed URL
- [ ] Phase 5 Depth and bounties done, feature freeze
- [ ] Phase 6 Submitted, every link checked

## Event brief
- Event, platform, URL: Mezo Buildathon "Build with MUSD and MEZO", run on AKINDO WaveHack, https://app.akindo.io/wave-hacks/OVOO0gdrVU8379D10. Sponsor: Supernormal OpCo BVI Ltd (Mezo, built by Thesis). Discord https://discord.mezo.org (ask for the Developer role as a hackathon participant).
- Deadline with time zone; total days or hours: **Wave 2 submission deadline 2026-11-13 05:30 UTC (06:30 Lagos time)**, from the AKINDO API and countdown. The overview text says Wave 2 runs to 15 Nov; the platform deadline is earlier, so we use 13 Nov. Wave 2 opened 2026-11-02. Judging to 2026-11-19 (API) / 22 Nov (text). Winners and online demo session 2026-11-23. On 2026-11-05 10:00 Lagos we have **7 days 20 hours**. A "3rd Wave" (deadlines 30 Nov, 6 Dec) shows on the timeline UI but is not in the API (`nextWaveEnabled: false`) or the rules; treat it as not real unless announced.
- Edits allowed after submitting until cutoff? Unknown for AKINDO. Assume no: submit once, a day early (12 Nov), with every field confirmed by Right.
- Theme and main track: extend MUSD (Bitcoin-backed CDP stablecoin) and MEZO utility. Track 1 DeFi (borrowing, lending, looping, yield): "How might we expand MUSD and MEZO utility as collateral and productive capital across DeFi?" Track 2 Access and Distribution: "How might we make MUSD and MEZO easier to discover, access, and use?" Both tracks may be selected.
- Judging criteria and weights (verbatim): Mezo Integration 30% "Effective and meaningful use of MUSD or MEZO. Depth of integration matters more than surface-level usage". Product & Business Viability 30% "How directly the project extends MUSD/MEZO utility in line with your track's challenge question. Problem-solution fit, business viability, and complementarity with the Mezo ecosystem and its audience". Technical Implementation 20% "Code quality, architecture, security, and whether the solution is genuinely composable and deployable rather than just a demo". User Experience 10% "Design, usability, and accessibility". Submission Materials Quality 10% "Demo clarity and pitch effectiveness". Stated priorities: extend existing Mezo products, composability with lending markets, DEXs and ve systems beats isolated consumer apps, long-term commitment counts.
- How judging really works (from Wave 1 feedback, `docs/research/wave1-scores.md`): scores are 0 to 10 in steps of 2. Integration uses a ladder: L3 protocol-aware reads, L4 our contracts act on Mezo primitives on chain, L5 composes them so MUSD gets a new job or new demand, exercised on chain by outside users, ideally mainnet. Judges run a security review; one High finding caps Technical at 4. Missing or private deck or video caps Materials at 2; video over 2:15 is penalised. They check explorer verification, product-sent (not script-sent) transactions, outside wallets, a revenue model, team and track fields, and that README claims match reality.
- Prizes: $5,000 Wave 2 pool paid in MEZO at 14-day TWAP on KYB day. Wave 1 paid $1,800 of $2,000 across 101 of 135 projects: top 5 got $69 to $80, median paid $15. At that shape a top finish in Wave 2 is roughly $170 to $220.
- Disqualification rules:
  - Must integrate MUSD and/or MEZO, with a working deployment on Mezo mainnet, Mezo testnet, Ethereum, Base or BNB Chain.
  - Built during the hackathon or a new extension of an existing product; Wave 2 resubmissions must show meaningful progress. New teams may enter in Wave 2.
  - Original or properly credited work; reused code must be open source and cited. No third-party IP infringement.
  - One team per participant per wave. 18+. Prohibited jurisdictions (DPRK, DRC, Cuba, Donetsk, Luhansk, Crimea, Iran, Iraq, PRC, Syria, sanctioned places). Nigeria is not on the list.
  - Winners must pass KYB (W9 or W8-BEN, government ID, proof of address, wallet). No KYB, no payout.
  - Supernormal gets a non-exclusive licence to display the submission; we keep IP. BVI law.
- Required submission items and limits: live testnet or mainnet link, public GitHub repo, project deck (public link or PDF in repo), 2-minute pitch video (stay under 2:00), and the AKINDO form: project name, category (3 to 5 words), TL;DR (one sentence), how it works (problem, function, how MUSD/MEZO is used and positioned), target group, tech stack, track(s), chain, project status (new), readiness (mainnet, testnet, demo), next three milestones with dates, team members, roles, X or LinkedIn.
- Sponsor tools and official docs links: Mezo docs https://mezo.org/docs (full mirror in `docs/research/mezo-docs/`, index at https://mezo.org/docs/llms.txt), MUSD contracts https://github.com/mezo-org/musd, Mezo Earn (Tigris) https://github.com/mezo-org/tigris, Mezo Passport `@mezo-org/passport`, MUSD x402 payments guide, Goldsky subgraphs, oracles (Skip via MUSD PriceFeed, Stork, Supra, Pyth). Summary in `../_chains/MEZO.md`.
- Chain and network: Mezo testnet (chain 31611) for development; Mezo mainnet (31612) with tiny real amounts if the plan needs mainnet proof. See `../_chains/MEZO.md`.
- Past winners studied: Wave 1 top 5 (Doji, Surety, Janus, Keel, Mezonk) and the full 135 with judge feedback. See `docs/phase0-report.md` section 6.

## Bounties
No separate bounties. Track 1 and Track 2 can both be selected on the form.

| Bounty | Prize | Requirements checklist | Our real integration | Proof (link / tx / clip) |
|--------|-------|------------------------|----------------------|--------------------------|
| Wave 2 pool | $5,000 in MEZO, proportional to points | MUSD/MEZO integration, deployment, repo, deck, 2 min video, form | Frontline: redemption market on MUSD troves (Track 1 primary, Track 2 secondary) | testnet contracts, Redeem Lab tx, video |

## Product
- Problem (one real detail or user quote): On Mezo mainnet, redemptions hit MUSD loans 1,310 times against 28 liquidations. 1,176 redemptions took 78.9 BTC from 189 borrowers; 3 loans remain open. MUSD trades at $0.990, so redeeming at $1 minus 0.75% is a standing arbitrage against the weakest loan.
- Specific user, device and situation: a BTC holder with 0.05 to 2 BTC who wants dollars at Mezo's 1% fixed rate and does not want BTC sold at $1 parity, on phone or laptop. Second side: an absorber happy to turn part of their BTC into dollars at the oracle price for a premium.
- Why now: Mezo Borrow TVL fell 63% in about 60 days; sMUSD earns about 0% because there is almost no loan interest left; Liquity v2 already proved paid redemption ordering; MUSD cannot change its core.
- Done statement: "A borrower can open a 1% MUSD loan on Mezo testnet through Frontline, see exactly how much MUSD must be redeemed before anyone reaches it, and watch a real redemption stop at the absorber layer while their BTC stays untouched. An absorber can deposit BTC and earn the protection premium."
- Hero moment, and the system behind it: Redeem Lab. A real testnet redemption shrinks the absorber loan and leaves the protected loan unchanged. It works because `TroveManager.redeemCollateral` walks from the lowest nominal ratio upward, and the Absorber Vault keeps its loans there.
- Must have: AbsorberVault with proxies, band keeping, protect(), re-arm, surplus claim; ProtectedLoan factory with protection floor and premium collection; PremiumModel with coverage cap; FrontlineLens; 7 screens; keeper; unit, fuzz, invariant and fork tests; verified contracts; mainnet analytics; README, deck, video, 10+ outside wallets. Detail in `docs/plan.md` section 5.
- Should have: auto top-up reserve, Telegram coverage alerts, payoff simulator, Recovery Mode handling.
- Could have: migrate an existing EOA trove, Mezo Earn gauge, capped mainnet deploy, absorber MUSD in sMUSD.
- Won't have: MUSD core changes, Morpho markets, veBTC collateral, cross-chain.
- Riskiest unknowns, with the fallback for each: S1 proxy-owned troves and gas (fallback BorrowerOperationsSignatures on EOA troves); S2 redemption order on testnet (no fallback, stop if it fails); S3 enough testnet BTC (Discord grant, fewer loans); S4 not hitting other teams' loans (preview every redemption); S5 absorbers near 110% (price-shock tests, raise floor). See `docs/plan.md` section 7.
- Stack and host: Foundry, Solidity 0.8.28 with `evm_version = london`, OpenZeppelin 5 (Clones, ReentrancyGuard). Next.js, wagmi, viem, Mezo Passport, shadcn/ui on Vercel. Keeper as a scheduled job. Mezo testnet (31611); mainnet read-only analytics.

## User flow and screens
Journey: 1 Line, 2 Borrow, 3 My loan, 4 Absorb, 5 My absorber position, 6 Redeem Lab, 7 Proof. The last column is filled in Phase 3, before contract code.

| # | Screen | User does | Adapter function (mocked in Phase 2) | Real implementation (contract call / read / event / API) |
|---|--------|-----------|--------------------------------------|----------------------------------------------------------|
| 1 | Line | Reads the problem, inspects the live redemption line, picks a side | `getLine(network)`, `getStats(network)` | `FrontlineLens.line(depth)` (walks SortedTroves.getLast/getPrev, TroveManager.getCurrentICR and getTroveDebt, tags absorber and protected owners); `TroveManager.getTroveOwnersCount`; `PriceFeed.fetchPrice`; mainnet stats from TroveManager Redemption and TroveUpdated events |
| 2 | Borrow | Sets BTC and MUSD, reads the full quote, opens a protected loan | `quoteBorrow(input)`, `openProtectedLoan(input)` | Quote: `FrontlineLens.quote` inputs (`AbsorberVault.coverage`, `premiumRate`, `maxNewProtectedDebt`) plus `BorrowerOperations.getBorrowingFee`, math in `web/src/lib/frontline/math.ts`. Open: `ProtectedLoanFactory.open{value: btc}(debt, upperHint, lowerHint)` (deploys the owner's ProtectedLoan clone, which calls `BorrowerOperations.openTrove`); hints from `HintHelpers.getApproxHint` and `SortedTroves.findInsertPosition` |
| 3 | My loan | Checks health and buffer; adds BTC, repays, borrows more, withdraws, closes, claims surplus | `getLoan(owner)`, `adjustLoan(action)`, `closeLoan()`, `claimLoanSurplus()` | Read: `ProtectedLoanFactory.loanOf(owner)`, `TroveManager.getEntireDebtAndColl(loan)`, `getCurrentICR`, `ProtectedLoan.premiumDue()`, `FrontlineLens.bufferAhead(loan)`. Write: `ProtectedLoan.addColl{value}`, `withdrawColl`, `borrow`, `repay` (pulls MUSD with transferFrom, then `repayMUSD`), `close` (pulls debt minus 200, `closeTrove`, returns BTC), `claimSurplus`; events `Adjusted`, `Closed` |
| 4 | Absorb | Reads vault stats and the simulator, deposits BTC | `getVault()`, `quoteAbsorb(input)`, `deposit(amount)` | Read: `AbsorberVault.stats()` (absorber debt, protected debt, coverage, premium, NAV, share price), `FrontlineLens` for yield. Write: `AbsorberVault.deposit{value: btc}()` mints flABS shares at NAV; event `Deposited` |
| 5 | My absorber position | Checks value split, premiums and conversions, withdraws | `getAbsorber(owner)`, `withdraw(shares)` | Read: `AbsorberVault.balanceOf`, `previewWithdraw(shares)`, `totalSupply`; per-user premiums and conversions from `Deposited`, `Withdrawn`, `PremiumReceived` and TroveManager `Redemption` events. Write: `AbsorberVault.withdraw(shares, hints)` unwinds each absorber trove pro rata (repay with held MUSD, withdraw collateral) and pays BTC plus MUSD |
| 6 | Redeem Lab | Enters MUSD, previews which loans are hit, runs a real redemption | `previewRedemption(amount)`, `redeem(amount)` | Preview: `HintHelpers.getRedemptionHints(amount, price, 0)` plus `FrontlineLens.line`. Run: `TroveManager.redeemCollateral(truncatedAmount, firstHint, upperHint, lowerHint, partialNICR, 0)` from the user's wallet (needs MUSD); event `Redemption` |
| 7 | Proof | Browses transactions, keeper log, addresses, mainnet analytics | `getActivity()`, `getKeeperLog()`, `getMainnetRedemptions()` | Frontline events (`Deposited`, `Withdrawn`, `Rebalanced`, `Rearmed`, `Protected`, `PremiumReceived`, `LoanOpened`, `Adjusted`, `Closed`) via `eth_getLogs`; keeper log from keeper job output; addresses from `addresses.ts` |

## Brand and design
- Name and tagline: Frontline (working name). "Someone else stands first in the redemption line, and you pay them for it." Final name with the design directions.
- Three words for the feel: calm, exact, trustworthy.
- Avoid: crypto-casino visuals, purple to blue gradients, neon, glass cards, emoji icons, rows of identical cards, unexplained jargon (explain "redemption" in one line where it first appears).
- Colors and fonts (or "agent proposes, Right picks"): agent proposes 2 or 3 directions on 6 Nov, Right picks.
- Inspiration: screenshots and notes in `design/inspiration/` (MUSD Compass, Baserate, Janus; `notes.md` says what to take and avoid), links in `design/inspiration/links.md`. Three Line-screen directions on the design canvas https://claude.ai/artifact/7XCXzZVgmjjBJbz4DbayAN: A Departures (dark, mono board), B Statement (white, serif, highlighter), C Queue tool (light, interactive redemption preview).
- Chosen direction (after Right's pick): C (light, interactive queue tool) as the base, with A's line table on Redeem Lab and Proof (2026-11-05). Tokens in `web/src/app/globals.css`: absorbers orange, protected blue, Geist and Geist Mono.

## Live status (agent updates after every feature and before ending a session; under 250 words)
- Done: Phase 2 build. Seven screens (Line, Borrow, My loan, Absorb, My position, Redeem Lab, Proof) on one typed adapter (`web/src/lib/frontline/`). Mock adapter covers latency, signature, pending, confirmed, reverted, rejected, empty and RPC-down states (mock panel, preview only). Chain adapter already reads the real testnet line; Frontline writes say "not deployed yet". Shared quote and redemption math with 16 unit tests. Mezo Passport wallets plus a preview-only demo wallet. Next 15.5.29, React 19.1.10.
- In progress: Right reviews the UI on the preview deployment (Phase 2 gate).
- Next: Phase 3 contracts (AbsorberVault, ProtectedLoan factory, PremiumModel, FrontlineLens) with fork tests; fill the Screens table's last column first.
- Blockers and risks: testnet BTC for deployment (faucet CAPTCHA). Demo wallet does not survive a hard reload (preview only). 46 transitive advisories inside Mezo Passport, none in our bundle (`docs/security.md`).
- Decisions and assumptions: deadline 13 Nov 05:30 UTC; submit 12 Nov; solo team; testnet product, mainnet analytics.
- Deployed URLs and contract addresses: app https://frontline-mezo.vercel.app (production, chain adapter); previews use the mock adapter and need Vercel login (decision 007); repo https://github.com/whatsgood200/frontline-mezo. Raw research local only; local branch `backup/pre-publish` keeps the pre-publish history.
- Parking lot (ideas for later, never for this build): Track 2 phone-first BTC dollar account on top of Frontline; migration of existing EOA troves; Mezo Earn gauge.

## Project rules and gotchas (agent appends after every bug or surprise)
- AKINDO pages render client side. The public API is `https://api.akindo.io/public/wave-hacks/OVOO0gdrVU8379D10/waves` and `.../waves/<waveId>/submissions` (includes judge scores and comments after judging).
- MUSD minimum loan is 1,800 MUSD plus a 200 MUSD gas deposit (2,000 MUSD debt at open). Liquidation below 110% ICR in every mode; Recovery Mode below 150% TCR blocks some withdrawals.
- Mezo docs list a stale veBTC address; use the live addresses in `../_chains/MEZO.md` M.5b.
- Redemptions, not liquidations, hit MUSD borrowers: 1,310 trove hits by redemption against 28 by liquidation (mainnet, all time).
- Redemption takes min(amount, debt - 200) per loan. A full hit closes the loan by redemption and sends leftover BTC to CollSurplusPool (owner claims). A partial hit that would leave net debt under 1,800 MUSD is cancelled and the whole redemption stops there.
- Testnet already has third-party loans from 116.4% ratio up (5 Nov). Preview every demo redemption so we never hit other teams' loans.
- Local forks cannot run Mezo precompiles (BTC price oracle `0x7b7c…0015`, MEZO). Fork tests read the live price over RPC and mock `PriceFeed.fetchPrice`.
- On this Windows machine forge's compiler download fails silently. solc 0.8.28 is installed at `~/.svm/0.8.28/solc-0.8.28.exe` (checksum verified); run forge with `FOUNDRY_SOLC` set to that path.
- Vercel blocks vulnerable Next.js versions at deploy time. Keep Next on the latest 15.5.x backport and run `pnpm audit --prod` before pushing.
- In Git Bash, prefix `vercel api /v9/...` with `MSYS_NO_PATHCONV=1` or the path is rewritten to a Windows path.
- Mezo Passport on Next.js: import `@mezo-org/passport/dist/src/config` only (the index loads a Styletron UI kit that breaks SSR), transpile passport, orangekit, orangekit-contracts and orangekit-smart-account, and alias `@coinbase/wallet-sdk`, `@base-org/account`, `@coinbase/cdp-sdk` and `@react-native-async-storage/async-storage` to false. Passport declares React 18 but its config code runs on React 19 (pnpm `peerDependencyRules`).
- Testnet ValidatorsVoter is the zero address (judge note to Doji); validator-vote features are mainnet only.
