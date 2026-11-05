"use client";

import { useState } from "react";
import { TxStatusView } from "@/components/tx-status";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle, Row } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/states";
import { WalletGate } from "@/components/wallet-gate";
import { frontline, type AbsorberPosition } from "@/lib/frontline";
import { useAbsorber, useLine } from "@/lib/queries";
import { useTx } from "@/lib/use-tx";
import { btc, cn, musd, pct } from "@/lib/format";

const PARTS = [0.25, 0.5, 1];

function PositionView({ owner, pos }: { owner: `0x${string}`; pos: AbsorberPosition }) {
  const line = useLine();
  const price = line.data?.btcPrice ?? 0;
  const [part, setPart] = useState(0.25);
  const tx = useTx();
  const btcValue = pos.btc * price;
  const total = btcValue + pos.musd;
  const btcShare = total > 0 ? btcValue / total : 1;
  const shares = pos.shares * part;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card aria-labelledby="value-title">
        <CardTitle id="value-title" aside={`${pct(pos.shareOfVault, 2)} of the vault`}>
          Your absorber share
        </CardTitle>
        <p className="text-sm text-muted">Worth now</p>
        <p className="tabular font-mono text-4xl font-semibold">{musd(total)} MUSD</p>
        <div className="mt-4 flex h-3 overflow-hidden rounded" role="img" aria-label={`${pct(btcShare, 0)} BTC, ${pct(1 - btcShare, 0)} MUSD`}>
          <div className="bg-absorber" style={{ width: `${btcShare * 100}%` }} />
          <div className="bg-protected-rest" style={{ width: `${(1 - btcShare) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span><span className="font-semibold">{btc(pos.btc)} BTC</span> still in BTC</span>
          <span><span className="font-semibold">{musd(pos.musd, 2)} MUSD</span> from redemptions</span>
        </div>
        <div className="mt-5">
          <Row label="BTC you deposited" value={`${btc(pos.depositedBtc)} BTC`} />
          <Row label="BTC turned into MUSD by redemptions" value={`${btc(pos.btcConverted)} BTC`} hint="At the oracle price, so the dollar value is unchanged" />
          <Row label="Premiums earned" value={`${musd(pos.premiumsEarned, 2)} MUSD`} />
          <Row label="Shares" value={musd(pos.shares, 2)} />
        </div>
      </Card>

      <Card aria-labelledby="withdraw-title">
        <CardTitle id="withdraw-title">Withdraw</CardTitle>
        <p id="part-label" className="mb-2 text-sm font-semibold text-ink-2">How much</p>
        <div role="group" aria-labelledby="part-label" className="mb-4 grid grid-cols-3 gap-2">
          {PARTS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={p === part}
              onClick={() => setPart(p)}
              className={cn("min-h-11 rounded-[var(--radius-control)] border text-sm font-semibold", p === part ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:bg-sunken")}
            >
              {p === 1 ? "All" : pct(p, 0)}
            </button>
          ))}
        </div>
        <div className="rounded-[var(--radius-control)] bg-sunken p-3 text-sm">
          You receive about <span className="font-semibold">{btc(pos.btc * part)} BTC</span> and <span className="font-semibold">{musd(pos.musd * part, 2)} MUSD</span>.
        </div>
        <Button variant="outline" size="lg" className="mt-4 w-full" disabled={tx.inFlight} onClick={() => tx.run("Withdrawal", (s) => frontline.withdraw(owner, shares, s))}>
          {tx.inFlight ? "Withdrawing…" : `Withdraw ${part === 1 ? "everything" : pct(part, 0)}`}
        </Button>
        <div className="mt-3">
          <TxStatusView status={tx.status} onDismiss={tx.reset} />
        </div>
        <p className="mt-4 text-xs text-muted">
          The vault repays part of its absorber loans to free your BTC. Very large withdrawals can wait for the next keeper run.
        </p>
      </Card>
    </div>
  );
}

function OwnerPosition({ owner }: { owner: `0x${string}` }) {
  const pos = useAbsorber(owner);
  if (pos.isLoading) return <LoadingBlock label="Reading your position" lines={5} />;
  if (pos.isError) return <ErrorState error={pos.error} onRetry={() => pos.refetch()} />;
  if (!pos.data)
    return (
      <EmptyState title="You have not deposited yet" action={<ButtonLink href="/absorb" variant="absorber">Earn as an absorber</ButtonLink>}>
        Deposit BTC to stand at the front of the redemption line and earn the premium protected borrowers pay.
      </EmptyState>
    );
  return <PositionView owner={owner} pos={pos.data} />;
}

export function PositionScreen() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My absorber position</h1>
        <p className="text-ink-2">What your share is worth, how much redemptions have turned into MUSD, and what you have earned.</p>
      </header>
      <WalletGate purpose="see your position">{(owner) => <OwnerPosition owner={owner} />}</WalletGate>
    </div>
  );
}
