# 004 Collect the premium as extra debt on the borrower's trove

Date: 2026-11-05. Status: accepted.

**Context.** Weekly signatures for premium payments would make protection lapse whenever a user is away.

**Decision.** `collectPremium(loan)` is callable by anyone. It calls `withdrawMUSD` on the borrower's trove and sends the premium to the vault, the same way interest adds to debt.

**Tradeoffs.** It pays Mezo's 0.1% borrowing fee on each draw, so collection is batched (weekly). The floor check runs after the draw, so collection can never push a loan below protection.
