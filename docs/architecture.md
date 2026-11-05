# Architecture: Frontline

## Contracts and Mezo dependencies

```mermaid
flowchart LR
  subgraph Users
    B[Protected borrower]
    A[Absorber]
    R[Redeemer, anyone]
    K[Keeper, permissionless]
  end

  subgraph Frontline
    F[ProtectedLoanFactory]
    PL[ProtectedLoan proxy<br/>one trove per user]
    V[AbsorberVault<br/>shares, NAV, held MUSD]
    AT[AbsorberTrove proxies<br/>front of the line]
    PM[PremiumModel<br/>coverage curve]
    L[FrontlineLens<br/>line, buffer, coverage]
  end

  subgraph Mezo MUSD
    BO[BorrowerOperations]
    TM[TroveManager]
    ST[SortedTroves]
    HH[HintHelpers]
    PF[PriceFeed]
    CSP[CollSurplusPool]
    MUSD[(MUSD token)]
  end

  B -->|open, adjust, close| F --> PL
  PL -->|openTrove, adjustTrove, repayMUSD, withdrawMUSD, closeTrove, claimCollateral| BO
  A -->|deposit BTC, withdraw| V --> AT
  AT -->|openTrove, repayMUSD, withdrawMUSD, closeTrove, claimCollateral| BO
  K -->|rebalance, rearm, protect, collectPremium| V
  K -->|collectPremium| PL
  PL -->|premium in MUSD| V
  V --> PM
  R -->|redeemCollateral| TM
  TM -->|walks lowest nominal ratio first| ST
  TM -->|surplus BTC after full redemption| CSP
  L --> TM & ST & PF & V
  PL & AT --> HH
```

## Off-chain

```mermaid
flowchart LR
  UI[Next.js app on Vercel<br/>Mezo Passport, wagmi, viem] -->|reads| RPC[(Mezo testnet RPC)]
  UI -->|writes, user signs| RPC
  UI --> API[Server routes<br/>cached analytics, health]
  API -->|events| EXP[(Mezo explorer API<br/>mainnet and testnet)]
  KEEP[Keeper job<br/>scheduled] -->|rebalance, rearm, collect, protect| RPC
  KEEP --> LOG[(Public keeper log)]
```

## Adapter boundary (Phase 2 mocks, Phase 4 real)

All chain access goes through `web/lib/frontline/` with one typed interface and two implementations (`mock`, `chain`). Production builds fail if `mock` is selected.

## Key invariants (tested)

1. While absorber redeemable debt is above zero, no redemption reduces a protected loan's collateral.
2. A ProtectedLoan action never leaves its nominal ratio below the protection floor.
3. Vault NAV (BTC collateral × price + held MUSD + idle BTC − debt) is unchanged by a redemption at the oracle price, apart from fees.
4. Only the owner moves a protected loan's collateral or principal; the keeper can only collect the premium due.
5. Share accounting: deposits and withdrawals cannot dilute existing absorbers (first-depositor and rounding attacks covered).
