"use client";

import { useState } from "react";
import { FrontNotice } from "@/components/front-notice";
import { LineBoard } from "@/components/line-board";
import { TxStatusView } from "@/components/tx-status";
import { AmountField } from "@/components/ui/amount-field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, Row } from "@/components/ui/card";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { WalletGate } from "@/components/wallet-gate";
import { frontline } from "@/lib/frontline";
import { useLine, useRedemptionPreview, useWalletMusd } from "@/lib/queries";
import { useTx } from "@/lib/use-tx";
import { btc, cn, musd, parseAmount } from "@/lib/format";

const QUICK = [5_000, 15_000, 30_000];

export function LabScreen() {
  const line = useLine();
  const [raw, setRaw] = useState("5000");
  const amount = parseAmount(raw);
  const valid = Number.isFinite(amount) && amount > 0;
  const preview = useRedemptionPreview(valid ? amount : null);
  const walletMusd = useWalletMusd();
  const notEnoughMusd = walletMusd !== undefined && valid && amount > walletMusd;
  const tx = useTx();
  const p = preview.data;
  const blocked = !!p && p.touchesOtherLoans;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Redeem Lab</h1>
        <p className="text-ink-2">
          Hand in MUSD, take BTC, and watch MUSD&apos;s own order decide whose loan pays. Preview first: the lab only runs redemptions that stop
          inside the absorber layer, so other teams&apos; testnet loans are never touched.
        </p>
      </header>

      {line.data ? <FrontNotice line={line.data} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card aria-labelledby="redeem-title">
          <CardTitle id="redeem-title">Redeem</CardTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {QUICK.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={amount === v}
                  onClick={() => setRaw(String(v))}
                  className={cn("min-h-11 rounded-[var(--radius-control)] border px-3.5 text-sm font-semibold", amount === v ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:bg-sunken")}
                >
                  {musd(v)} MUSD
                </button>
              ))}
            </div>
            <AmountField
              label="MUSD to redeem"
              unit="MUSD"
              value={raw}
              onChange={setRaw}
              error={raw && !valid ? "Enter a number, like 5000" : notEnoughMusd ? `Your wallet holds ${musd(walletMusd ?? 0, 2)} MUSD.` : null}
              hint={walletMusd !== undefined ? `Wallet: ${musd(walletMusd, 2)} MUSD` : "Get test MUSD by borrowing on testnet.mezo.org."}
            />
            {blocked ? (
              <p role="alert" className="rounded-[var(--radius-control)] border border-warning/30 bg-warning-soft p-3 text-sm">
                This size would reach other teams&apos; testnet loans after the absorbers. The lab stops at the absorber layer: lower the amount.
              </p>
            ) : null}
            <WalletGate purpose="run a redemption">
              {(owner) => (
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    disabled={!valid || !p || blocked || notEnoughMusd || tx.inFlight || preview.isFetching}
                    onClick={() => tx.run("Redemption", (s) => frontline.redeem(owner, amount, s))}
                  >
                    {tx.inFlight ? "Redeeming…" : valid ? `Redeem ${musd(amount)} MUSD for BTC` : "Enter an amount"}
                  </Button>
                  <TxStatusView status={tx.status} onDismiss={tx.reset} />
                </div>
              )}
            </WalletGate>
          </div>
        </Card>

        <Card aria-labelledby="preview-title">
          <CardTitle id="preview-title" aside={preview.isFetching ? "updating…" : "HintHelpers.getRedemptionHints"}>
            Preview
          </CardTitle>
          {preview.isError ? (
            <ErrorState error={preview.error} onRetry={() => preview.refetch()} />
          ) : !p ? (
            <p className="text-sm text-muted">Enter an amount to see which loans it takes from.</p>
          ) : (
            <div className="flex flex-col">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-[var(--radius-control)] bg-absorber-soft p-3"><p className="text-xs text-absorber-ink">Absorbers</p><p className="tabular font-mono font-semibold">{musd(p.fromAbsorbers)}</p></div>
                <div className={cn("rounded-[var(--radius-control)] p-3", p.fromOthers > 0 ? "bg-warning-soft" : "bg-sunken")}><p className="text-xs text-muted">Other loans</p><p className="tabular font-mono font-semibold">{musd(p.fromOthers)}</p></div>
                <div className={cn("rounded-[var(--radius-control)] p-3", p.fromProtected > 0 ? "bg-danger-soft" : "bg-protected-soft")}><p className="text-xs text-protected-ink">Protected</p><p className="tabular font-mono font-semibold">{musd(p.fromProtected)}</p></div>
              </div>
              <Row label="It stops at" value={p.stopsAt ?? "Nothing"} />
              {p.steps.at(-1)?.taken === 0 ? (
                <p className="py-2 text-sm text-warning">MUSD would cancel the last step: it would leave {p.stopsAt} under the 1,800 MUSD minimum debt. Pick another size.</p>
              ) : null}
              <Row label="BTC you receive" value={`${btc(p.btcOut, 6)} BTC`} />
              <Row label="Redemption fee (0.75%, in BTC)" value={`${btc(p.redemptionFeeBtc, 6)} BTC`} />
            </div>
          )}
        </Card>
      </div>

      <section aria-labelledby="board-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="board-title" className="text-xl font-semibold">The redemption line, front first</h2>
          <p className="font-mono text-xs text-muted">Ordered the way redeemCollateral walks it</p>
        </div>
        {line.isLoading ? (
          <LoadingBlock label="Reading the line" lines={8} />
        ) : line.isError ? (
          <ErrorState error={line.error} onRetry={() => line.refetch()} />
        ) : line.data ? (
          <LineBoard loans={line.data.loans} taken={p?.steps} caption="Mezo testnet redemption line with what this redemption takes from each loan" />
        ) : null}
      </section>
    </div>
  );
}
