# EVENT.md: (name TBD) at Mezo Buildathon, Wave 2

Read at the start of every session. On event facts and scoring this file overrides AGENTS.md. Chain notes: `../_chains/MEZO.md`. Phase 0 report: `docs/phase0-report.md`. Idea research and recommendation: `docs/idea-research.md`. Raw research: `docs/research/` (Wave 1 scores and judge feedback, Wave 2 entries, Mezo docs mirror).

Folder is `2026-11-mezo-buildathon` until the project has a name; rename it then.

## Status
- [x] Phase 0 Decode and research (2026-11-05)
- [ ] Phase 1 Plan approved by Right (gate)
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
| Wave 2 pool | $5,000 in MEZO, proportional to points | MUSD/MEZO integration, deployment, repo, deck, 2 min video, form | TBD in Phase 1 | |

## Product
- Problem (one real detail or user quote):
- Specific user, device and situation:
- Why now:
- Done statement: "A user can ..."
- Hero moment, and the system behind it:
- Must have:
- Should have:
- Could have:
- Won't have:
- Riskiest unknowns, with the fallback for each:
- Stack and host:

## User flow and screens
| # | Screen | User does | Adapter function (mocked in Phase 2) | Real implementation (contract call / read / event / API) |
|---|--------|-----------|--------------------------------------|----------------------------------------------------------|
| 1 |        |           |                                      |                                                          |

## Brand and design
- Name and tagline:
- Three words for the feel:
- Avoid:
- Colors and fonts (or "agent proposes, Right picks"):
- Inspiration: screenshots in `design/inspiration/`, links:
- Chosen direction (after Right's pick):

## Live status (agent updates after every feature and before ending a session; under 250 words)
- Done: Phase 0 report; idea research with live mainnet data (`docs/idea-research.md`); 13 ideas tested and killed with evidence; MUSD and Mezo Earn addresses verified on chain and saved in `../_chains/MEZO.md`.
- In progress: waiting on Right to approve the direction (recommended: Frontline, a redemption market for MUSD).
- Next: Phase 1 plan for the approved idea, then four spikes (proxy troves on testnet, redemption ordering, testnet MUSD supply, gauge path).
- Blockers and risks: overlaps NEAR HACKATHON (Verdict, 14 Nov). Small prize. Keel (#4) and Baserate (#7) cite the same redemption pain with different fixes.
- Decisions and assumptions: deadline 13 Nov 05:30 UTC; submit 12 Nov; solo team.
- Deployed URLs and contract addresses:
- Parking lot (ideas for later, never for this build): Track 2 phone-first BTC dollar account on top of Frontline.

## Project rules and gotchas (agent appends after every bug or surprise)
- AKINDO pages render client side. The public API is `https://api.akindo.io/public/wave-hacks/OVOO0gdrVU8379D10/waves` and `.../waves/<waveId>/submissions` (includes judge scores and comments after judging).
- MUSD minimum loan is 1,800 MUSD plus a 200 MUSD gas deposit (2,000 MUSD debt at open). Liquidation below 110% ICR in every mode; Recovery Mode below 150% TCR blocks some withdrawals.
- Mezo docs list a stale veBTC address; use the live addresses in `../_chains/MEZO.md` M.5b.
- Redemptions, not liquidations, hit MUSD borrowers: 1,310 trove hits by redemption against 28 by liquidation (mainnet, all time).
- Testnet ValidatorsVoter is the zero address (judge note to Doji); validator-vote features are mainnet only.
