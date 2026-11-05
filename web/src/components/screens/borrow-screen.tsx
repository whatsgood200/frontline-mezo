"use client";

import { useState } from "react";
import { useWalletAccount } from "@mezo-org/passport/dist/src/hooks/useWalletAccount";
import { TxStatusView } from "@/components/tx-status";
import { AmountField } from "@/components/ui/amount-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle, Row } from "@/components/ui/card";
import { ErrorState, NotDeployedState, Skeleton } from "@/components/ui/states";
import { WalletGate } from "@/components/wallet-gate";
import { frontline, NotDeployedError } from "@/lib/frontline";
import { MUSD } from "@/lib/frontline/params";
import { useBorrowQuote, useLoan, useWalletBtc } from "@/lib/queries";
import { useTx } from "@/lib/use-tx";
import { btc, musd, parseAmount, pct, usd } from "@/lib/format";

export function BorrowScreen() {
  const [collRaw, setColl] = useState("0.10");
  const [debtRaw, setDebt] = useState("4000");
  const coll = parseAmount(collRaw);
  const debt = parseAmount(debtRaw);
  const valid = Number.isFinite(coll) && coll > 0 && Number.isFinite(debt) && debt > 0;
  const quote = useBorrowQuote(valid ? { collateralBtc: coll, borrowMusd: debt } : null);
  const { accountAddress: address } = useWalletAccount();
  const walletBtc = useWalletBtc();
  const existing = useLoan(address);
  const tx = useTx();

  const q = quote.data;
  const notEnough = walletBtc !== undefined && valid && coll > walletBtc;
  const collError = collRaw && !Number.isFinite(coll) ? "Enter a number, like 0.1" : notEnough ? `Your wallet holds ${btc(walletBtc ?? 0)} BTC.` : null;
  const debtError = debtRaw && !Number.isFinite(debt) ? "Enter a number, like 4000" : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Borrow with protection</h1>
        <p className="text-ink-2">
          Open an MUSD loan against your BTC at Mezo&apos;s fixed {pct(MUSD.interestRate, 0)}. Frontline keeps it above the absorber layer, so
          redemptions reach absorbers first.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card aria-labelledby="borrow-form">
          <CardTitle id="borrow-form">Your loan</CardTitle>
          <div className="flex flex-col gap-5">
            <AmountField
              label="BTC to lock"
              unit="BTC"
              value={collRaw}
              onChange={setColl}
              error={collError}
              hint={walletBtc !== undefined ? `Wallet: ${btc(walletBtc)} BTC` : "Connect a wallet to see your balance."}
              onMax={walletBtc !== undefined ? () => setColl(Math.max(0, walletBtc - 0.0005).toFixed(4)) : undefined}
            />
            <AmountField label="MUSD to receive" unit="MUSD" value={debtRaw} onChange={setDebt} error={debtError} hint={`Minimum ${musd(Math.ceil(MUSD.minNetDebt / (1 + MUSD.borrowingFee)))} MUSD (Mezo's minimum loan).`} />

            {q && q.warnings.length > 0 ? (
              <ul className="flex flex-col gap-2" aria-live="polite">
                {q.warnings.map((w) => (
                  <li key={w.code} className="rounded-[var(--radius-control)] border border-warning/30 bg-warning-soft p-3 text-sm">
                    {w.message}
                  </li>
                ))}
              </ul>
            ) : null}

            <WalletGate purpose="open a protected loan">
              {(owner) =>
                existing.data ? (
                  <div className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] bg-protected-soft p-4 text-sm">
                    <p>You already have a protected loan. Add BTC, borrow more or repay on My loan.</p>
                    <ButtonLink href="/loan" variant="protected">Go to my loan</ButtonLink>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="protected"
                      size="lg"
                      disabled={!q?.allowed || notEnough || tx.inFlight || quote.isFetching}
                      onClick={() => tx.run("Protected loan", (s) => frontline.openProtectedLoan(owner, { collateralBtc: coll, borrowMusd: debt }, s))}
                    >
                      {tx.inFlight ? "Opening…" : valid ? `Lock ${btc(coll)} BTC and borrow ${musd(debt)} MUSD` : "Enter amounts"}
                    </Button>
                    <TxStatusView status={tx.status} onDismiss={tx.reset} />
                    {tx.status.state === "confirmed" ? (
                      <ButtonLink href="/loan" variant="outline" className="self-start">See my loan</ButtonLink>
                    ) : null}
                  </div>
                )
              }
            </WalletGate>
          </div>
        </Card>

        <Card aria-labelledby="quote-title">
          <CardTitle id="quote-title" aside={quote.isFetching ? "updating…" : "live quote"}>
            Before you sign
          </CardTitle>
          {quote.isError ? (
            quote.error instanceof NotDeployedError ? <NotDeployedState message={quote.error.message} /> : <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
          ) : !q ? (
            valid ? (
              <div className="flex flex-col gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : (
              <p className="text-sm text-muted">Enter how much BTC to lock and how much MUSD you want.</p>
            )
          ) : (
            <div className="flex flex-col">
              <div className="mb-4 rounded-[var(--radius-control)] bg-protected-soft p-4">
                <p className="text-sm text-protected-ink">MUSD redeemed before your loan is touched</p>
                <p className="tabular mt-1 font-mono text-3xl font-semibold">
                  {q.bufferIsMinimum ? <span className="mr-2 font-sans text-lg font-medium text-ink-2">More than</span> : null}
                  {musd(q.bufferAhead)}
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  <span className="font-semibold text-absorber-ink">{musd(q.guaranteedBuffer)} guaranteed</span> by absorbers ·{" "}
                  {q.bufferIsMinimum ? "more than " : ""}
                  {musd(q.bufferAhead - q.guaranteedBuffer)} from other loans
                </p>
              </div>
              <Row label="Collateral ratio" value={pct(q.ratio)} hint={`Protected loans stay at 150% or more`} />
              <Row label="Liquidated if BTC falls to" value={usd(q.liquidationPrice)} />
              <Row label="Borrowing fee (one-off, 0.1%)" value={`${musd(q.borrowingFee, 2)} MUSD`} />
              <Row label="Gas deposit (returned on close)" value={`${musd(q.gasDeposit)} MUSD`} />
              <Row label="Total debt" value={`${musd(q.totalDebt, 2)} MUSD`} />
              <Row label="Mezo interest, fixed" value={`${pct(q.interestRate, 2)} a year`} />
              <Row label="Frontline premium" value={`${pct(q.premiumRate, 2)} a year`} hint="Paid to absorbers; moves with coverage" />
              <Row label="Cost in the first year" value={`${musd(q.firstYearCost)} MUSD`} strong />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
