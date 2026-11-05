# Phase 1b spikes

Run 2026-11-05 on a local fork of Mezo testnet (chain 31611, block about 16,587,000) against the real MUSD contracts. Code: `contracts/test/spikes/ForkSpikes.t.sol`. Re-run with:

```bash
cd contracts && forge test --match-path "test/spikes/*" -vv
```

The fork pins `PriceFeed.fetchPrice` to the live price read over RPC, because the oracle behind it is a Mezo precompile (`0x7b7c…0015`) that a local fork cannot execute.

| Spike | Result | Evidence |
|---|---|---|
| S1 Contract-owned trove | **Pass.** A proxy opened, borrowed more, repaid and closed a trove; collateral came back to the proxy | openTrove with hints 525,675 gas; withdrawMUSD 153,213; repayMUSD 146,191; closeTrove 96,269 |
| S2 Redemption order | **Pass.** With an absorber loan under the lowest third-party loan (116% on testnet) and a protected loan at 200%, a real `redeemCollateral` of 4,000 MUSD hit only the absorber; protected collateral and debt unchanged | `test_S2_redemptionHitsAbsorberNotProtected` |
| S2b Full hit | **Pass.** Redeeming the absorber's debt minus 200 closed it by redemption; the proxy claimed 0.0062 BTC surplus from CollSurplusPool | `test_S2_fullHitClosesAbsorberAndSurplusIsClaimable` |
| S2c Partial under minimum | **Pass.** A redemption that would leave the absorber under 1,800 net debt reverts with "Unable to redeem any amount"; nothing behind it moves | `test_S2_partialBelowMinimumStopsTheWholeRedemption` |
| S3 Testnet funds | **Waiting on Right** (faucet needs a CAPTCHA) | |
| S4 Never hit other teams' loans | **Pass by design.** `HintHelpers.getRedemptionHints` returns the absorber as the first hint, so the Redeem Lab preview can refuse any redemption whose path leaves our loans | `test_S2_partialBelowMinimumStopsTheWholeRedemption` asserts the first hint |
| S5 Price shock | **Pass, with a warning.** A 3% BTC drop took an absorber from about 114.5% to 111%; repaying from held MUSD restored 125% and liquidation reverted | A drop of about 4% before the keeper acts would liquidate a 114.5% absorber |

## What changes because of these results

- Decision 002 (one proxy per trove) is confirmed. The EIP-712 fallback is not needed.
- Decision 006 (band): the testnet band under 116% leaves only about a 4% price move of room. Absorber loans get a permissionless `protect()` with a bounty, plus a keeper check every block window. The final floor will come from fuzzing price paths. On mainnet the band sits at 120 to 130% (8 to 15% room).
- Gas is fine: 0.5M to open with hints, far from the 2M ceiling Keel hit with bad estimates. The app will still set explicit gas limits with a 30% margin.
