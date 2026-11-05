# Frontline

A redemption market for MUSD on Mezo. Borrowers stop being redeemed by paying BTC holders who are glad to be redeemed first.

**Status: in progress for the Mezo Buildathon, Wave 2 (deadline 13 Nov 2026).** This README grows with the build; nothing below is claimed as working until it is linked to a transaction or a test.

## The problem, in Mezo's own numbers (mainnet, read 5 Nov 2026)

- Redemptions hit MUSD loans **1,310** times; liquidations **28** times.
- **1,176** redemptions took **78.9 BTC** from **189** borrowers. **3** loans remain open.
- MUSD trades at **$0.990**, so buying it and redeeming at $1 minus a 0.75% fee is a standing arbitrage against the weakest loan.

Method and sources: [docs/idea-research.md](docs/idea-research.md).

## How Frontline works

MUSD redeems loans in order of collateral ratio, lowest first, and nobody can skip ahead (`TroveManager.redeemCollateral`). Frontline puts a paid layer of willing **absorber** loans at the front of that line. **Protected** borrowers stay on Mezo's official troves, sit behind the absorbers, and pay a premium that streams to them. Redemptions keep defending the peg; Frontline changes who pays for them. Liquity v2 fixed the same problem with paid redemption ordering; MUSD cannot change its core, so we build that market on top.

Plan: [docs/plan.md](docs/plan.md). Architecture: [docs/architecture.md](docs/architecture.md). Decisions: [docs/decisions/](docs/decisions/).

## What is proven so far

35 contract tests pass, including 24 end-to-end fork tests against the real MUSD contracts on Mezo testnet (`contracts/test/fork/`) and the spikes in [docs/spikes.md](docs/spikes.md):
- A contract can own and manage a trove (open with hints: 525,675 gas).
- A real `redeemCollateral` hits the absorber loan and leaves the protected loan untouched.
- A full hit closes the absorber loan and its surplus BTC is claimable.
- After a 3% BTC drop, repaying from the vault's held MUSD restores the absorber from 111% to 125%.

## Deployed on Mezo testnet (chain 31611)

| Contract | Address | Source |
|---|---|---|
| AbsorberVault | [0x4580…8581](https://explorer.test.mezo.org/address/0x45805145536767435185c991097D8193A8518581) | verified |
| ProtectedLoanFactory | [0xd7F4…98AB](https://explorer.test.mezo.org/address/0xd7F44463230e95f6b490Da29b8bc475De25C98AB) | verified |
| FrontlineLens | [0x165b…8F18](https://explorer.test.mezo.org/address/0x165b7Da20d3688eeF6b6E3D8227e43492Ea38F18) | verified |
| ProtectedLoan (template, created by the factory) | [0x4F47…cffC](https://explorer.test.mezo.org/address/0x4F4704404D073d8f4d60C609269845186802cffC) | bytecode matches `contracts/out` exactly |
| AbsorberTrove 0 and 1 (created by the vault) | [0xec6E…3784](https://explorer.test.mezo.org/address/0xec6E0a1f1acEEf06E0F75a82b0683EC0298e3784), [0x4EE7…1872](https://explorer.test.mezo.org/address/0x4EE7c5C31176B0B6E09B3d5E0dee005c417B1872) | created by the verified vault |

Built on Mezo's MUSD contracts: TroveManager `0xE47c…6bb0`, SortedTroves `0x722E…68fA`, BorrowerOperations `0xCdF7…bEE5`, PriceFeed `0x86bC…9366`. Band 112 to 115%. Deploy record: `contracts/deployments/testnet.json` and `contracts/broadcast/`.

## Repository

| Path | What |
|---|---|
| `contracts/` | Foundry project, Solidity 0.8.28, London EVM |
| `web/` | Next.js app (Mezo Passport, viem) |
| `docs/` | Research, plan, architecture, decisions, spike results |

```bash
cd contracts && forge build && forge test --match-path "test/spikes/*" -vv
cd web && cp .env.example .env.local && pnpm install && pnpm dev
```

## Built with

Mezo MUSD contracts (github.com/mezo-org/musd), Foundry, OpenZeppelin 5.1, Next.js, viem. Code is written with AI assistance (Claude Code); every claim in this repository is tied to a test, a transaction or a source.

## License

MIT
