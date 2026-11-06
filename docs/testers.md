# Try Frontline on Mezo testnet

Thank you for testing. It takes about 10 minutes and uses test BTC only, which has no value.

**What Frontline is.** On Mezo, when someone redeems MUSD, the protocol takes BTC from the loan with the lowest collateral ratio first. Frontline lets borrowers pay a small premium to stand behind a layer of willing "absorber" loans, so redemptions reach the absorbers first.

App: https://frontline-mezo.vercel.app

## 1. Get a wallet and test BTC (3 minutes)

1. Use any of these wallets:
   - **Bitcoin:** Unisat, OKX or Xverse (connect through Mezo Passport in the app).
   - **EVM:** MetaMask, Rabby or another browser wallet.
2. Open the app and press **Connect wallet**. If the app asks, press **Switch to Mezo Testnet**. To add the network by hand:
   - Network name: Mezo Testnet
   - RPC: `https://rpc.test.mezo.org`
   - Chain ID: `31611`
   - Currency: BTC
   - Explorer: `https://explorer.test.mezo.org`
3. Get test BTC at https://faucet.test.mezo.org (solve the CAPTCHA, paste your wallet address). Gas on Mezo is paid in BTC, so keep a little for fees.

## 2. Be an absorber (2 minutes)

1. Open **Absorb**.
2. Enter a deposit, for example **0.005 BTC**, read the quote, then press **Deposit** and confirm in your wallet.
3. Open **My position** to see your shares and their value.

Your BTC waits in the vault until the keeper puts it into an absorber loan at the front of the redemption line. If a redemption reaches it, part of your BTC becomes MUSD at the oracle price; you can withdraw both at any time from **My position**.

## 3. Be a protected borrower (3 minutes)

You need about **0.045 BTC** for the smallest loan (Mezo's minimum is 1,800 MUSD, and Frontline keeps protected loans at 150% or more).

1. Open **Borrow**.
2. Enter **0.045 BTC** and **1,800 MUSD**. Read the quote: "MUSD redeemed before your loan is touched" is the buffer in front of you.
3. Press the button and confirm in your wallet. The MUSD arrives in your wallet.
4. Open **My loan** to see your ratio, your debt and the premium. Try **Add BTC** or **Repay**.

If Borrow says the absorber layer can protect 0 MUSD more, no absorber loans are active yet. Borrowing opens once absorbers have deposited and the keeper has deployed their BTC (it runs every 10 minutes); try again later.

## 4. Look at the proof (1 minute)

Open **Proof**. Your transactions appear under "Frontline transactions" with links to the Mezo explorer.

## 5. Tell us what you think

Answer three questions, either in a GitHub issue (https://github.com/whatsgood200/frontline-mezo/issues/new?template=tester-feedback.yml) or by replying to whoever sent you this:

1. Before Frontline, had you heard of MUSD redemptions? Would you pay a premium to avoid them, and how much?
2. Would you deposit BTC as an absorber for a yield? What yield would make it worth it?
3. What confused you, or what broke?

Please include your wallet address. It is public on chain anyway, and we list testers' addresses on the Proof page with explorer links so judges can see real outside use. Tell us if you would rather not be listed.
