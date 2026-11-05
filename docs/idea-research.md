# Idea research: Mezo Buildathon Wave 2

Written 2026-11-05. Follows Right's "Finding Winning Hackathon Ideas" framework: start with the hackathon, understand the technology, find a real problem, study previous winners, iterate, challenge every idea, check for gaps. Everything below comes from live mainnet reads, Mezo's own source code, three past Mezo events and every Buildathon entry. Raw data sits in `docs/research/`.

## 1. What the live chain says (mainnet, read 2026-11-05)

| Fact | Number | Source |
|---|---|---|
| BTC on Mezo | 1,115 BTC | BTC token total supply, explorer |
| BTC locked in veBTC | 804 BTC (about $64.5M, 72% of all BTC on Mezo), 6,174 locks | `supply()` on the live VeBTC `0x3D4b…f279` |
| veBTC yield | 1.59% APY (0.05% fees, 1.54% rewards); max lock 28 days | DefiLlama yields, Mezo docs |
| veMEZO | 282.3M MEZO in 2,936 locks, 36% APY, worth about $1.67M | live veMEZO `0xb90f…0122`, DefiLlama |
| MEZO price | $0.0059, market cap $2.95M, about $2.5k DEX liquidity | CoinGecko, DexScreener |
| MUSD supply | 29.5M: 14.17M in the Stability Pool (protocol bootstrap loan), 6.48M in the sMUSD vault strategy, 5.3M in a CL pool, 2.75M bridged out | holders list, explorer |
| sMUSD yield | about 0% | DefiLlama |
| MUSD price | $0.990 on Base Aerodrome ($1.13M liquidity) and Ethereum Uniswap | DexScreener |
| MUSD borrow rate | 1.00% fixed for new loans | `InterestRateManager.interestRate()` = 100 bps |
| Open MUSD loans | **3 troves**, 16.65 BTC collateral | `TroveManager.getTroveOwnersCount()`, ActivePool |
| Mezo Borrow TVL | $3.61M to $1.34M over about 60 days (-63%) | DefiLlama |
| **Redemptions, all time** | **1,176 redemptions, 5.89M MUSD redeemed, 78.9 BTC taken from 189 borrowers** | every `Redemption` event on TroveManager |
| **Trove hits** | **1,310 by redemption against 28 by liquidation** (47 to 1) | `TroveUpdated` operation codes (enum: 1 liquidate, 2 redeemCollateral) |
| Morpho Blue | live on Mezo mainnet `0x5658…A311` (BTC/mUSDC market, Mezo's USDC Lending Vault); not on testnet | explorer, Mezo docs |

**What this means.** MUSD borrowing is being drained by redemptions, not liquidations. MUSD trades below $0.9925, and redeeming pays $1 of BTC minus 0.75%, so buying cheap MUSD and redeeming it against the lowest-ratio loan is a standing arbitrage. With 3 loans left, every borrower is first in line. A dozen Buildathon entries guard against liquidation, a risk that happened 28 times in the protocol's life.

## 2. What Mezo's technology makes possible (framework step 2)

- The cheapest dollar credit in crypto: 1% fixed, set at open, up to about 90% LTV. Morpho USDC borrowing elsewhere costs 5 to 7%.
- Remote trove control: `BorrowerOperationsSignatures` lets a contract act on a loan with the owner's EIP-712 signature. That allows automation without custody.
- A strict, public redemption order: `redeemCollateral` always starts at the lowest nominal collateral ratio at or above 110%. `_isValidFirstRedemptionHint` stops a redeemer from skipping ahead. **That ordering can be engineered on purpose.**
- BTC-only gas, Bitcoin-native wallets through Passport, and the veBTC/veMEZO gauge system for paying incentives to any vault.

## 3. Ideas tested and killed (so we do not restart later)

| Idea | Why it is dead | Evidence |
|---|---|---|
| Self-repaying MUSD loan from veBTC rewards | veBTC earns 1.59% against a 1% loan rate; payoff takes decades. Already won as StratumFi (Mezo Hackathon 1, community choice), and attempted by thaw | live yields; Mezo blog |
| Loans against veBTC | Taken by the Wave 1 #1, #2 and #4 entries (Doji, Surety, Keel) plus Latch and thaw; also, locks last at most 28 days | Wave 1 scores |
| MEZO or veMEZO as loan collateral | Whole veMEZO market is worth $1.67M and MEZO has $2.5k of DEX liquidity, so liquidations cannot clear. thaw tried it | CoinGecko, DexScreener |
| Liquid veMEZO | Lockless (stMEZO, $18), BynD and Fractals (Hackathon 2 winners), Aurove | entries |
| Savings circles (ajo) | Cark won Hackathon 2; KhipuVault won Hackathon 1; AjoCircle and Round in Wave 1 | Mezo blog |
| Liquidation alerts and guards | More than 12 entries, and liquidations are rare (28 ever) | trove events |
| Redemption-free borrowing in a separate market | Keel (#4, inside the sMUSD vault) and Baserate (#7, on Morpho) | Wave 1 |
| MUSD yield vault or router | No real yield sources: sMUSD about 0%, MUSD pools tiny | DefiLlama |
| Fixed-rate or yield tokens on sMUSD | tenor (new Wave 2 repo, 4 Nov), Doji credit units | GitHub |
| MUSD lending market on Base | MUSD trades at $0.99, and borrowers would rather take USDC on Base's Morpho; weak value proposition; NTT is mainnet only | DexScreener |
| BTC carry vault (borrow at 1%, earn 5% on USDC elsewhere) | Sells MUSD for USDC, which pushes the peg down and causes more redemptions. Mezo judges would mark it as harmful | peg data |
| Nigeria off-ramp (borrow, then naira) | Owo (Product 8, but a High finding), Assumable, Kudi | Wave 1 |
| Agent payments, x402 | About 10 entries, plus Mezo's own x402 guide | entries |

Each was checked against the 135 Wave 1 and 13 Wave 2 entries, the 9 winners of Mezo Hackathon 1 and the 9 of Hackathon 2, GitHub repos pushed since 27 Oct, and the Liquity, ETHGlobal and DoraHacks history.

## 4. The gap

Every redemption-related entry does one of two things:

1. **Leaves the official loans.** Keel and Baserate move borrowers to a separate market. That fixes the borrower but abandons Mezo Borrow, the product Mezo built, and it splits liquidity.
2. **Defends one loan by raising its own ratio.** Lifeline ("keep 25,000 MUSD of other debt ahead of me") and Pylon's reserve. That only works if other, weaker loans exist to be redeemed first. With 3 loans on mainnet there is nobody to hide behind.

Nobody supplies the thing that is missing: **a deliberate, paid layer of loans that want to be redeemed first.** Liquity, which MUSD is forked from, saw the same failure and fixed it in Liquity v2 by letting borrowers pay for their place in the redemption line. MUSD cannot change its core contracts. We can rebuild that market on top of them.

## 5. Recommended product: a redemption market for MUSD (working name "Frontline")

**One line:** Frontline lets MUSD borrowers stop being redeemed by paying BTC holders who are glad to be redeemed first.

**Who:**
- *Protected borrowers.* BTC holders who want 1% dollar credit on Mezo without their BTC being taken at $1 whenever MUSD dips. Today they either avoid Mezo Borrow (3 loans left) or leave for other markets.
- *Absorbers.* BTC holders who are happy to turn BTC into dollars at the oracle price (sellers averaging out, treasuries needing runway, miners) and want to be paid while they wait.

**How it works:**
1. Absorbers deposit BTC into the **Absorber Vault** (ERC-4626). The vault opens absorber loans through per-loan proxies (Mezo allows one trove per address) at a deliberately low ratio band, for example 120 to 135%. The vault keeps every MUSD it borrows. Because it holds that MUSD, it can repay instantly to lift a loan away from 110%, so absorber loans are not exposed to liquidation in the normal way.
2. Redemptions always start at the lowest ratio, so they hit absorber loans first. A redemption cancels absorber debt and takes BTC at the oracle price. The absorbers' position shifts from BTC to MUSD at par, which is the outcome they signed up for.
3. Borrowers open **protected loans** through Frontline (their own trove behind a per-user proxy, controlled by the owner's signature). Frontline keeps every protected loan above the absorber band and shows the **redemption buffer**: how much MUSD must be redeemed before anyone reaches it.
4. Protected borrowers pay a **protection premium** (for example 0.5 to 2% a year on debt, priced by a coverage curve: buffer ahead of them against protected debt). It streams to absorbers in MUSD. Total cost stays around 2 to 3% a year, far below 5 to 7% elsewhere.
5. The vault can also take MEZO emissions and incentives through a Mezo Earn gauge, because it protects every MUSD borrower. That is the same way Mezo funds its USDC Lending Vault.

**Why judges should score it high:**
- *Integration (30%):* it composes TroveManager, SortedTroves, HintHelpers, BorrowerOperations and BorrowerOperationsSignatures, PriceFeed, CollSurplusPool, the sMUSD vault (absorber MUSD) and gauges. MUSD gets a new mechanism: a priced redemption line. It **extends Mezo Borrow instead of leaving it**, and it keeps redemptions working as the peg tool. It only changes who pays for them.
- *Product (30%):* it has a measured problem with Mezo's own numbers (189 borrowers, 78.9 BTC, 1,176 redemptions, 3 loans left), revenue from day one (a share of premiums), and a two-sided market that brings borrowers back to Mezo's flagship product.
- *Technical (20%):* the ordering guarantee comes from Mezo's code (section 2), which we cite line by line. Invariant tests cover "no protected loan is redeemed while absorber debt remains".
- *Differentiation:* Keel and Baserate are detours; Lifeline and Pylon are self-defence. Frontline is the missing market. Liquity v2 is public proof the mechanism matters.

**Honest risks and design answers:**
| Risk | Answer |
|---|---|
| Free riders: any outside loan above the absorber band is shielded without paying | With 3 loans on mainnet this is near zero today. Protected users get things free riders do not: a guaranteed buffer size, automatic ratio management, a refund rule if the buffer runs out, and a dashboard. Long term, a Mezo Earn gauge pays absorbers for shielding the whole system, a public good |
| Not enough absorbers | Premium plus gauge incentives plus "sell BTC at oracle price with no slippage". Three interview questions for real BTC holders below. Fallback: a protocol-seeded absorber loan for the demo, labelled as seeded |
| Minimum debt of 2,000 MUSD per loan | Absorber loans are pooled, so one large loan per proxy. Protected borrowers face the same minimum as Mezo Borrow (stated plainly) |
| Interest accrual moves ratios | A keeper rebalances with on-chain hints; ordering uses nominal ratio (collateral over principal), read straight from `getNominalICR` |
| Recovery Mode (system ratio under 150%) blocks some actions | Detect it on-chain, pause new protected loans, keep repay paths open |
| Testnet has no organic redemptions | We run real redemptions ourselves in the demo and invite outside wallets to redeem. Every step is visible on the explorer |

**Feature set (rich, not padded):**
- *Contracts:* AbsorberVault (ERC-4626, withdrawal queue, BTC+MUSD exit), AbsorberTrove proxies, ProtectedTrove proxies with EIP-712 control, PremiumModel (coverage-curve pricing), Keeper module (permissionless rebalance with bounty, hints computed on-chain), QueueLens (one call returns the whole redemption line with buffer per loan), gauge hook.
- *App:* live landing that tells the data story from mainnet; Borrow (protected) with a full quote before signing (rate, premium, buffer, liquidation price, 2,000 MUSD minimum); Absorb with a payoff simulator; a visual **redemption line** showing every loan on testnet and mainnet in order; position dashboards; activity with explorer links; a "try to redeem me" page where anyone can run a real testnet redemption and watch it stop at the absorbers.
- *Ops:* indexer for history, keeper bot, health endpoint, Telegram alert when buffer coverage drops.
- *Proof:* Foundry unit, fuzz and invariant tests, fork tests against testnet MUSD contracts, verified contracts, a security notes file, outside testnet wallets listed with explorer links.

**Questions for Right to ask real BTC holders (Discord, X, Nigerian Bitcoin groups):**
1. If you borrowed dollars against your BTC at 1%, what would you pay per year to be sure your BTC is never sold at $1 parity?
2. Would you deposit BTC into a vault that converts it to dollars only when redemptions happen, and pays you a yield while it waits? What yield makes that worth it?
3. What stopped you from borrowing on Mezo Borrow, or what made you leave?

**Spikes before UI (Phase 1b, about 1 hour each):** (1) Open, adjust and close a trove from a proxy contract on testnet with hints, and measure gas (Keel reported bad gas estimates). (2) Seed two troves at different ratios, redeem, and confirm the order on testnet. (3) Get MUSD on testnet (faucet BTC, open a trove) in amounts that meet the 2,000 MUSD minimum. (4) Find a working testnet gauge path for the vault.

## 6. Alternatives if Right prefers something else

- **B. Track 2 distribution with real Nigerian users** on top of Frontline later (a phone-first BTC-backed dollar account). It has real users, but Owo, Kudi and Assumable exist, and integration tops out lower on its own.
- **C. Peg defence for MUSD.** Plumb ($20) already does standing bids; we would be second.

## 7. Facts to confirm with Mezo on Discord

1. Is the Wave 2 deadline 13 Nov 05:30 UTC or 15 Nov?
2. Would Mezo whitelist a gauge for a vault that shields borrowers from redemption, on testnet and mainnet?
3. Is there a supported way to get testnet MUSD in larger amounts for redemption demos?
4. Docs list VeBTC at `0x7D80…5914`, but the live contract holding 804 BTC is `0x3D4b…f279`. Which addresses are current for VeBTCVoter and the rewards distributor?
