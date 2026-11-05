"use client";

import { useState } from "react";
import { TxStatusView } from "@/components/tx-status";
import { AmountField } from "@/components/ui/amount-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle, Row } from "@/components/ui/card";
import { ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { WalletGate } from "@/components/wallet-gate";
import { frontline } from "@/lib/frontline";
import { useAbsorbQuote, useVault, useWalletBtc } from "@/lib/queries";
import { useTx } from "@/lib/use-tx";
import { btc, multiple, musd, parseAmount, pct } from "@/lib/format";

export function AbsorbScreen() {
  const vault = useVault();
  const [raw, setRaw] = useState("0.50");
  const amount = parseAmount(raw);
  const valid = Number.isFinite(amount) && amount > 0;
  const quote = useAbsorbQuote(valid ? amount : null);
  const walletBtc = useWalletBtc();
  const tx = useTx();
  const notEnough = walletBtc !== undefined && valid && amount > walletBtc;
  const error = raw && !Number.isFinite(amount) ? "Enter a number, like 0.5" : notEnough ? `Your wallet holds ${btc(walletBtc ?? 0)} BTC.` : null;
  const q = quote.data;
  const v = vault.data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Earn as an absorber</h1>
        <p className="text-ink-2">
          Deposit BTC that stands first in MUSD&apos;s redemption line. Protected borrowers pay you a premium for it. When a redemption
          arrives, part of your BTC turns into MUSD at the oracle price.
        </p>
      </header>

      <Card aria-labelledby="vault-title">
        <CardTitle id="vault-title" aside="AbsorberVault">
          The absorber layer right now
        </CardTitle>
        {vault.isLoading ? (
          <LoadingBlock label="Reading the vault" lines={3} />
        ) : vault.isError ? (
          <ErrorState error={vault.error} onRetry={() => vault.refetch()} />
        ) : v ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
            <div><dt className="text-xs tracking-wide text-muted">ABSORBER BUFFER</dt><dd className="tabular mt-1 font-mono text-xl font-semibold text-absorber-ink">{musd(v.absorberDebt)} MUSD</dd><dd className="text-xs text-muted">{v.absorberLoans} absorber loans, {pct(v.bandLow, 0)} to {pct(v.bandHigh, 0)}</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">PROTECTED DEBT</dt><dd className="tabular mt-1 font-mono text-xl font-semibold text-protected">{musd(v.protectedDebt)} MUSD</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">COVERAGE</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{multiple(v.coverage)}</dd><dd className="text-xs text-muted">buffer ÷ protected debt</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">YOUR YIELD ON BTC</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{v.protectedDebt > 0 && v.absorberDebt > 0 ? pct(v.absorberYieldOnBtc, 2) : "n/a"}</dd><dd className="text-xs text-muted">veBTC: {pct(v.veBtcYield, 2)}</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">PREMIUM PAID BY BORROWERS</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{v.premiumRate > 0 ? `${pct(v.premiumRate, 2)} / yr` : "n/a"}</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">REDEEMED FROM ABSORBERS, 7 DAYS</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{musd(v.redeemedLast7d)} MUSD</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">VAULT HOLDS</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{btc(v.btcHeld, 3)} BTC</dd><dd className="text-xs text-muted">+ {musd(v.musdHeld)} MUSD held to repay instantly</dd></div>
            <div><dt className="text-xs tracking-wide text-muted">SHARE PRICE</dt><dd className="tabular mt-1 font-mono text-xl font-semibold">{v.sharePrice.toFixed(4)} MUSD</dd></div>
          </dl>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="deposit-title">
          <CardTitle id="deposit-title">Deposit</CardTitle>
          <div className="flex flex-col gap-5">
            <AmountField
              label="BTC to deposit"
              unit="BTC"
              value={raw}
              onChange={setRaw}
              error={error}
              hint={walletBtc !== undefined ? `Wallet: ${btc(walletBtc)} BTC` : "Connect a wallet to see your balance."}
              onMax={walletBtc !== undefined ? () => setRaw(Math.max(0, walletBtc - 0.0005).toFixed(4)) : undefined}
            />
            <WalletGate purpose="deposit as an absorber">
              {(owner) => (
                <div className="flex flex-col gap-3">
                  <Button variant="absorber" size="lg" disabled={!valid || notEnough || tx.inFlight} onClick={() => tx.run("Absorber deposit", (s) => frontline.deposit(owner, amount, s))}>
                    {tx.inFlight ? "Depositing…" : valid ? `Deposit ${btc(amount)} BTC` : "Enter an amount"}
                  </Button>
                  <TxStatusView status={tx.status} onDismiss={tx.reset} />
                  {tx.status.state === "confirmed" ? <ButtonLink href="/position" variant="outline" className="self-start">See my position</ButtonLink> : null}
                </div>
              )}
            </WalletGate>
          </div>
        </Card>

        <Card aria-labelledby="absorb-quote-title">
          <CardTitle id="absorb-quote-title" aside={quote.isFetching ? "updating…" : "live quote"}>
            If you deposit {valid ? `${btc(amount)} BTC` : ""}
          </CardTitle>
          {quote.isError ? (
            <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
          ) : !q ? (
            valid ? <div className="flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div> : <p className="text-sm text-muted">Enter how much BTC to deposit.</p>
          ) : (
            <div className="flex flex-col">
              <Row label="Absorber debt it backs, at 125%" value={`${musd(q.debtBacked)} MUSD`} />
              <Row label="Coverage after your deposit" value={multiple(q.coverageAfter)} hint="More absorbers means more cover and a lower premium" />
              <Row label="Premium borrowers pay after it" value={`${pct(q.premiumRateAfter, 2)} a year`} />
              <Row label="Less Mezo interest on absorber loans" value="1.00% a year" />
              <Row label="Shares you receive" value={musd(q.shares, 2)} />
              <Row label="Net yield on your BTC" value={pct(q.netYieldOnBtc, 2)} strong />
              <Row label="About, per year" value={`${musd(q.yearlyIncomeMusd)} MUSD`} />
            </div>
          )}
          <div className="mt-5 rounded-[var(--radius-control)] bg-absorber-soft p-4 text-sm text-ink-2">
            <p className="font-semibold text-absorber-ink">When a redemption reaches you</p>
            <p className="mt-1">
              MUSD takes BTC from absorber loans at the oracle price and cancels the same dollar value of their debt. Your share keeps its
              dollar value; part of it is now MUSD instead of BTC. You can withdraw both at any time, subject to the vault&apos;s liquid balance.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
