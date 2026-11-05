# 008 The keeper deploys only as much absorber debt as target coverage needs

Date: 2026-11-05. Status: accepted.

**Context.** A fork test showed absorbers losing value over 30 days: 63k MUSD of absorber debt paid Mezo's 1% interest while 4.2k of protected debt paid a 0.5% premium (coverage about 15x). Absorber net yield is premium / coverage - 1% interest, so oversupply turns it negative.

**Decision.** The keeper sizes absorber debt to a target coverage (about 0.35x, the plan's worked example). Extra deposits stay as idle BTC, which earns nothing but costs nothing, and are deployed as protected debt grows. The app shows absorber yield honestly, including when it is negative.

**Tradeoffs.** Idle BTC dilutes absorber yield while the market is young. The vault still accepts deposits so the layer can grow ahead of borrowers; the payoff simulator shows the effect.
