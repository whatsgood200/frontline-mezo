# What Right's screenshots teach us (2026-11-05)

## MUSD Compass (`musd-compass-1..7.png`, judges' UX 8)
- **Take:** the answer comes first. A huge number ("0.70%"), then one line saying exactly what it means ("cash a year after costs, assumes 90-day hold"). Inputs sit right next to the answer (amount, hold or borrow, days), so the page is a tool, not a brochure.
- **Take:** "How it's worked out" and "Why this number" next to every figure. "Before you go in: you keep 3.43 MUSD, 0.32 one-off costs, earned back after 8 days" is the best line on the page.
- **Take:** "Where the numbers come from": every figure has a source and a timestamp, and the page says "unavailable" rather than guessing.
- **Take:** honest tags: "bridge needed", "veMEZO locked 12 weeks", "Inactive".
- **Avoid:** purple primary and rows of identical pastel tiles (AGENTS.md section 8 bans both). Generic friendly sans.

## Baserate (`baserate-1.webp`)
- **Take:** a real identity. Dark green-black, an editorial serif display face, and a banknote-style guilloche seal whose ring text carries live chain data (block, rate, LLTV). It feels like money, not like a crypto template.
- **Take:** "Check the chain" as the second button: verification is a first-class action.
- **Avoid:** decoration that carries no information. Their seal works because the ring text is live; a static ornament would not.

## Janus (`janus-1..5.png`, judges' UX 8)
- **Take:** one colour per side of the market (bronze for buyers, patina for sellers), used consistently from hero to cards. Frontline has two sides too: absorbers and protected borrowers.
- **Take:** "The market right now" stat strip with monospace numbers directly under the hero.
- **Take:** "How a round works" as numbered steps, each naming the exact contract call (`placeOrder`, `settle`, `pokeBoost`). Technical judges can map UI to code in seconds.
- **Take:** "Built on Mezo's own contracts" with explorer links, and an honest "Planned, not built yet" section. Footer shows contract addresses with copy and explorer icons.
- **Avoid:** a serif-on-black look so close to Baserate's that we would read as a third copy.

## What this means for Frontline's Line screen
1. Lead with the live answer: how much MUSD sits in front of a protected loan right now, and how much has been redeemed from absorbers.
2. Two sides, two colours, everywhere: absorbers warm (they stand in front), protected cool (they sit behind).
3. The redemption line is the signature visual, built from live data, never decoration.
4. Every number gets a source, a timestamp and a "why this number".
5. Steps name the real MUSD and Frontline calls (`redeemCollateral`, `deposit`, `openProtected`, `collectPremium`).
6. Our own identity: neither Compass's purple pastels nor the Baserate/Janus serif-on-black.
