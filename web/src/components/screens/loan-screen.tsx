"use client";

import { useState } from "react";
import { TxStatusView } from "@/components/tx-status";
import { AmountField } from "@/components/ui/amount-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle, Row } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/states";
import { WalletGate } from "@/components/wallet-gate";
import { frontline, type LoanAction, type ProtectedLoan } from "@/lib/frontline";
import { FRONTLINE, MUSD } from "@/lib/frontline/params";
import { useLine, useLoan } from "@/lib/queries";
import { useTx } from "@/lib/use-tx";
import { btc, cn, musd, parseAmount, pct, usd } from "@/lib/format";

type Kind = LoanAction["kind"];
const ACTIONS: { kind: Kind; label: string; unit: "BTC" | "MUSD" }[] = [
  { kind: "addCollateral", label: "Add BTC", unit: "BTC" },
  { kind: "repay", label: "Repay", unit: "MUSD" },
  { kind: "borrowMore", label: "Borrow more", unit: "MUSD" },
  { kind: "withdrawCollateral", label: "Withdraw BTC", unit: "BTC" },
];

function statusChip(loan: ProtectedLoan) {
  if (loan.status === "protected") return <span className="rounded-md bg-protected px-2 py-0.5 text-xs font-semibold text-white">Protected</span>;
  if (loan.status === "at-risk") return <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">Below 150%: protection paused</span>;
  return <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Under 110%: liquidation risk</span>;
}

function LoanView({ owner, loan }: { owner: `0x${string}`; loan: ProtectedLoan }) {
  const line = useLine();
  const price = line.data?.btcPrice ?? 0;
  const [kind, setKind] = useState<Kind>("addCollateral");
  const [raw, setRaw] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const tx = useTx();
  const action = ACTIONS.find((a) => a.kind === kind)!;
  const amount = parseAmount(raw);
  const valid = Number.isFinite(amount) && amount > 0;

  let coll = loan.collateralBtc;
  let debt = loan.totalDebt;
  if (valid) {
    if (kind === "addCollateral") coll += amount;
    if (kind === "withdrawCollateral") coll -= amount;
    if (kind === "borrowMore") debt += amount * (1 + MUSD.borrowingFee);
    if (kind === "repay") debt -= amount;
  }
  const newRatio = price > 0 && debt > 0 ? (coll * price) / debt : loan.ratio;
  const problem = !valid
    ? null
    : coll < 0
      ? "That is more BTC than the loan holds."
      : debt - MUSD.gasDeposit < MUSD.minNetDebt
        ? `A loan keeps at least ${musd(MUSD.minNetDebt)} MUSD of debt. To repay everything, close the loan.`
        : newRatio < FRONTLINE.protectionFloor
          ? `That would put the loan at ${pct(newRatio)}, under the 150% protection floor.`
          : null;

  const send = () => {
    const a: LoanAction =
      kind === "addCollateral" ? { kind, btc: amount } : kind === "withdrawCollateral" ? { kind, btc: amount } : kind === "borrowMore" ? { kind, musd: amount } : { kind, musd: amount };
    tx.run(action.label, (s) => frontline.adjustLoan(owner, a, s)).then(() => setRaw(""));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card aria-labelledby="health-title">
          <CardTitle id="health-title" aside={statusChip(loan)}>
            Loan health
          </CardTitle>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">Collateral ratio</p>
              <p className="tabular font-mono text-3xl font-semibold">{pct(loan.ratio)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Liquidated if BTC falls to</p>
              <p className="tabular font-mono text-3xl font-semibold">{usd(loan.liquidationPrice)}</p>
            </div>
          </div>
          <div className="mt-5 rounded-[var(--radius-control)] bg-protected-soft p-4">
            <p className="text-sm text-protected-ink">MUSD redeemed before your loan is touched</p>
            <p className="tabular mt-1 font-mono text-2xl font-semibold">{musd(loan.bufferAhead)}</p>
            <p className="mt-1 text-sm text-ink-2">
              <span className="font-semibold text-absorber-ink">{musd(loan.guaranteedBuffer)} guaranteed</span> by absorbers ·{" "}
              {musd(loan.bufferAhead - loan.guaranteedBuffer)} from other loans
            </p>
          </div>
        </Card>

        <Card aria-labelledby="debt-title">
          <CardTitle id="debt-title">What you owe</CardTitle>
          <Row label="BTC locked" value={`${btc(loan.collateralBtc)} BTC`} />
          <Row label="Total debt" value={`${musd(loan.totalDebt, 2)} MUSD`} hint="Includes the 200 MUSD gas deposit, returned on close" />
          <Row label="Mezo interest, fixed" value={`${pct(loan.interestRate, 2)} a year`} />
          <Row label="Frontline premium" value={`${pct(loan.premiumRate, 2)} a year`} />
          <Row label="Premium accrued, collected weekly" value={`${musd(loan.premiumAccrued, 2)} MUSD`} hint="Added to your loan debt when collected" />
        </Card>
      </div>

      <Card aria-labelledby="manage-title">
        <CardTitle id="manage-title">Manage</CardTitle>
        <div role="tablist" aria-label="Loan action" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIONS.map((a) => (
            <button
              key={a.kind}
              role="tab"
              type="button"
              aria-selected={a.kind === kind}
              onClick={() => {
                setKind(a.kind);
                setRaw("");
                tx.reset();
              }}
              className={cn(
                "min-h-11 rounded-[var(--radius-control)] border px-2 text-sm font-semibold",
                a.kind === kind ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:bg-sunken",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="flex flex-col gap-4">
          <AmountField label={`${action.label} amount`} unit={action.unit} value={raw} onChange={setRaw} error={problem} />
          <div className="rounded-[var(--radius-control)] bg-sunken p-3 text-sm">
            New ratio: <span className="tabular font-mono font-semibold">{valid ? pct(newRatio) : pct(loan.ratio)}</span>
          </div>
          <Button variant="protected" size="lg" disabled={!valid || !!problem || tx.inFlight} onClick={send}>
            {tx.inFlight ? "Sending…" : valid ? `${action.label}: ${action.unit === "BTC" ? btc(amount) : musd(amount)} ${action.unit}` : action.label}
          </Button>
          <TxStatusView status={tx.status} onDismiss={tx.reset} />
        </div>

        <div className="mt-8 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Close the loan</h3>
          <p className="mt-1 text-sm text-ink-2">
            Repay {musd(loan.totalDebt - MUSD.gasDeposit, 2)} MUSD and get {btc(loan.collateralBtc)} BTC back. The 200 MUSD gas deposit covers the rest.
          </p>
          {confirmClose ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="danger" disabled={tx.inFlight} onClick={() => tx.run("Close loan", (s) => frontline.closeLoan(owner, s))}>
                Yes, repay and close
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClose(false)}>
                Keep the loan
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="mt-3" onClick={() => setConfirmClose(true)}>
              Close loan
            </Button>
          )}
          {loan.surplusBtc > 0 ? (
            <Button variant="outline" className="mt-3" onClick={() => tx.run("Claim surplus", (s) => frontline.claimLoanSurplus(owner, s))}>
              Claim {btc(loan.surplusBtc)} BTC surplus
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function OwnerLoan({ owner }: { owner: `0x${string}` }) {
  const loan = useLoan(owner);
  if (loan.isLoading) return <LoadingBlock label="Reading your loan" lines={6} />;
  if (loan.isError) return <ErrorState error={loan.error} onRetry={() => loan.refetch()} />;
  if (!loan.data)
    return (
      <EmptyState title="You have no protected loan yet" action={<ButtonLink href="/borrow" variant="protected">Borrow with protection</ButtonLink>}>
        Open one to borrow MUSD at Mezo&apos;s 1% while absorbers stand in front of you in the redemption line.
      </EmptyState>
    );
  return <LoanView owner={owner} loan={loan.data} />;
}

export function LoanScreen() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My loan</h1>
        <p className="text-ink-2">Your protected MUSD loan: how safe it is, what you owe and how to change it.</p>
      </header>
      <WalletGate purpose="see your loan">{(owner) => <OwnerLoan owner={owner} />}</WalletGate>
    </div>
  );
}
