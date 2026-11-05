# 003 The absorber vault keeps all the MUSD it borrows

Date: 2026-11-05. Status: accepted.

**Context.** Absorber loans sit near the bottom of the ratio range, close to 110%.

**Decision.** Borrowed MUSD stays in the vault. Any loan drifting toward 110% is repaid at once by the keeper or by anyone through `protect()`.

**Tradeoffs.** The MUSD earns nothing while held (sMUSD is about 0% anyway). It also adds no sell pressure on MUSD, which matters because the peg discount is what drives redemptions.
