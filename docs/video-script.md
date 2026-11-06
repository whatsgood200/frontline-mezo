# Pitch video: script and shot list

Target length **1:48** (the limit is 2:00; judges penalise anything over 2:15). Voiceover at about 130 words a minute. Captions on: `docs/video-captions.srt` follows this script line by line. Right records the voice; screen recordings come from the live app, except the redemption, which comes from the labelled fork clip until a live testnet redemption is possible.

## Script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 to 0:19 | **Problem.** Black screen, white text builds line by line: "1,310 redemptions. 28 liquidations." Then the Line page, front of the line. | Picture a Mezo borrower at a safe ratio. A redemption takes their BTC anyway, sold at one dollar per MUSD, because their loan was first in line. On Mezo mainnet, redemptions hit loans 1,310 times. Liquidations, 28. |
| 0:19 to 0:29 | **Solution.** Home page hero and the orange and blue line bar. | Frontline is a redemption market for MUSD. Borrowers pay a small premium, and BTC holders called absorbers stand first in line. |
| 0:29 to 0:38 | **Demo 1, the line.** Line page: click the 5,000 MUSD size; the preview stops at Absorber loan 1. | This is Mezo’s redemption line, read live from the chain. Pick a size and see where it stops. |
| 0:38 to 0:51 | **Demo 2, borrow.** Borrow page: type 0.2 BTC and 6,000 MUSD; zoom on "MUSD redeemed before your loan is touched" and the premium row. | I lock 0.2 BTC and borrow 6,000 MUSD. Before I sign, I see the absorber debt in front of me, and the premium: half a percent. |
| 0:51 to 1:08 | **Demo 3, the hero.** Fork clip: Redeem Lab preview, then confirmed. Keep the "Local fork of Mezo testnet" label in view. Cut to My loan, unchanged. | Someone redeems 5,000 MUSD, here on a local fork of Mezo testnet with the real contracts. The absorber loan drops from 30,347 to 25,347. My loan does not move. |
| 1:08 to 1:19 | **Demo 4, absorb.** Absorb page: the quote for a 0.5 BTC deposit, then the Proof page transactions. | Absorbers earn the premium. A redemption swaps part of their BTC for MUSD at the oracle price, with no loss in dollars. |
| 1:19 to 1:37 | **How it works.** Deck slide 8 (architecture), then slide 10 (built and tested). | Frontline does not change MUSD. Our contracts own real troves and keep absorber loans at the front. Thirty-six tests run against the real MUSD contracts; a self-review fixed one high and two medium issues. Wallets use Mezo Passport. |
| 1:37 to 1:48 | **Next.** Deck slide 11 (milestones), then the cover with the app URL. | Next: outside users on testnet, then a capped mainnet launch. So redemptions take BTC only from those who chose to be first. |

Hold the last frame (cover with the URL) for one second of silence. End at 1:48.

## Shot list

Record each shot as its own clip, then cut them together. All at 1920x1080, browser zoom 125%, notifications off, bookmarks bar hidden, the same wallet throughout.

1. **Title cards (0:00 to 0:06).** Two text cards on `#12161c`: "1,310 redemptions." then "28 liquidations." (Geist, white). Made in the editor; no recording needed.
2. **Line page, front of the line (0:06 to 0:19).** https://frontline-mezo.vercel.app, scroll to the redemption line; a slow scroll down the table.
3. **Home hero (0:19 to 0:29).** Top of the home page; hold still.
4. **Queue preview (0:29 to 0:38).** On the home page, click 5,000, then 30,000, then back to 5,000 so the "It stops at" box changes.
5. **Borrow quote (0:38 to 0:51).** Borrow page, wallet connected. Type 0.2 and 6,000. If the live coverage cap blocks the loan, record this shot from the fork build instead and keep its label in view; the quote is the point, not the transaction.
6. **Redemption (0:51 to 1:08).** Use `design/demo/fork-clip/` frames 04, 05 and 06 (or re-record on the fork with `pnpm fork:setup`; README has the commands). If a live testnet redemption becomes possible before recording, record that instead and drop the fork line from the voiceover.
7. **Absorb and Proof (1:08 to 1:19).** Absorb page with 0.5 in the deposit box; then Proof, scrolled to "Frontline transactions".
8. **Deck slides (1:19 to 1:48).** Present mode on slides 8, 10, 11 and 1 of the deck.

## Recording the voice

- Quiet room, phone or headset mic 15 cm from your mouth, one take per table row.
- Read slightly slower than feels natural; each row is timed with a little slack.
- Numbers to say as written: "thirty thousand three hundred forty-seven", "twenty-five thousand three hundred forty-seven".
- Export the final video at 1080p, upload to YouTube as unlisted, and test the link in a private window.

## What not to change

- Keep the fork label and the spoken "local fork" line while the redemption is from the fork. Judges check that claims match reality.
- Do not show a wallet seed, a private key, a terminal with environment variables, or the Vercel dashboard.
