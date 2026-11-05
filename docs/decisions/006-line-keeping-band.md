# 006 Absorber band follows the bottom of the line, with a hard floor

Date: 2026-11-05. Status: accepted, pending spikes S4 and S5.

**Context.** Testnet already has third-party loans from 116.4% up. Our demo redemptions must not hit other teams' loans, and absorber loans must not be liquidated.

**Decision.** The keeper targets a ratio just under the lowest third-party loan, never under a hard floor of 111.5%. The band is a bounded parameter: testnet 112 to 115%, mainnet 120 to 130%.

**Tradeoffs.** A thin gap above 110% on testnet depends on keeper uptime and `protect()`. Price-shock fork tests set the final floor.
