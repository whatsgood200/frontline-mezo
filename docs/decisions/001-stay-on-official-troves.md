# 001 Build on Mezo's official troves, not a separate market

Date: 2026-11-05. Status: accepted.

**Context.** Redemptions drained Mezo Borrow (1,310 trove hits against 28 liquidations; 3 loans left). Keel and Baserate fix this by moving borrowers to separate markets. Judges score "extend, don't detour".

**Decision.** Frontline keeps borrowers on MUSD troves and changes who is redeemed first, using the protocol's own ordering.

**Tradeoffs.** We inherit the 2,000 MUSD minimum and Recovery Mode rules. In return, every loan pays Mezo's fees and grows Mezo Borrow, and redemptions keep defending the peg.
