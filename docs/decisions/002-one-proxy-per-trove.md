# 002 One minimal proxy per trove

Date: 2026-11-05. Status: accepted, pending spike S1.

**Context.** MUSD allows one trove per address. The vault needs several absorber loans; each borrower needs a loan Frontline can manage.

**Decision.** EIP-1167 clones: AbsorberTrove (controlled only by the vault) and ProtectedLoan (owner-controlled, keeper may only collect premium).

**Tradeoffs.** Existing EOA troves cannot be moved in; migration is a Could (flash close and reopen). Fallback if S1 fails: act on the user's own trove through BorrowerOperationsSignatures.
