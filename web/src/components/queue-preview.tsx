"use client";

import { useMemo, useState } from "react";
import type { LineSnapshot } from "@/lib/frontline";
import { previewRedemption } from "@/lib/frontline/math";
import { btc, cn, musd, pct } from "@/lib/format";
import { ButtonLink } from "./ui/button";
import { sideFill, sideRest } from "./side-chip";

const SIZES = [5_000, 30_000, 60_000, 120_000];

/** Direction C's hero: pick a redemption size, see where MUSD's own order makes it stop. */
export function QueuePreview({ line }: { line: LineSnapshot }) {
  const [amount, setAmount] = useState(30_000);
  const preview = useMemo(() => previewRedemption(amount, line.loans, line.btcPrice), [amount, line]);
  const takenAt = new Map(preview.steps.map((s) => [s.position, s.taken]));
  const rows = line.loans.slice(0, 11);

  const verdict =
    preview.fromProtected > 0
      ? "This size runs past the buffer and reaches protected loans. Frontline caps new protected debt so coverage stays above its minimum."
      : preview.fromAbsorbers > 0
        ? `Protected loans are untouched. Absorbers swap ${btc(preview.fromAbsorbers / line.btcPrice, 3)} BTC for MUSD at the oracle price, with no loss in dollar value.`
        : line.frontlineLive
          ? "This size never reaches an absorber or protected loan."
          : "Frontline is not deployed on this network yet, so every loan here is an ordinary MUSD loan.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p id="size-label" className="text-sm font-semibold text-muted">
          Redemption size
        </p>
        <div role="group" aria-labelledby="size-label" className="flex flex-wrap gap-2">
          {SIZES.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={v === amount}
              onClick={() => setAmount(v)}
              className={cn(
                "min-h-11 rounded-[var(--radius-control)] border px-3.5 text-sm font-semibold",
                v === amount ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:bg-sunken",
              )}
            >
              {musd(v)} MUSD
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm text-muted">It stops at</p>
          <p className="text-2xl font-bold tracking-tight">{preview.stopsAt ?? "Nothing"}</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-control)] bg-absorber-soft p-3">
              <p className="text-xs text-absorber-ink">From absorbers</p>
              <p className="tabular mt-1 font-mono text-lg font-semibold">{musd(preview.fromAbsorbers)} MUSD</p>
            </div>
            <div className={cn("rounded-[var(--radius-control)] p-3", preview.fromProtected > 0 ? "bg-danger-soft" : "bg-protected-soft")}>
              <p className="text-xs text-protected-ink">From protected loans</p>
              <p className="tabular mt-1 font-mono text-lg font-semibold">{musd(preview.fromProtected)} MUSD</p>
            </div>
          </div>
          <p className="text-sm text-ink-2" aria-live="polite">
            {verdict}
          </p>
        </div>
        <ButtonLink href="/lab" variant="outline" className="self-start">
          Run it for real in Redeem Lab
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Front of the line</h2>
          <span className="font-mono text-xs text-muted">block {line.block.toLocaleString("en-US")}</span>
        </div>
        <ol className="flex flex-col">
          {rows.map((loan) => {
            const t = takenAt.get(loan.position) ?? 0;
            const share = Math.min(100, Math.round((t / loan.debt) * 1000) / 10);
            return (
              <li key={loan.address} className="grid grid-cols-[22px_minmax(0,1fr)_64px_78px] items-center gap-2.5 py-1.5">
                <span className="font-mono text-xs text-subtle">{loan.position}</span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-[13px] font-medium">{loan.label}</span>
                  <div className={cn("flex h-2 overflow-hidden rounded", sideRest[loan.side])} aria-hidden="true">
                    <div className={cn("transition-all duration-500", sideFill[loan.side])} style={{ width: `${share}%` }} />
                  </div>
                </div>
                <span className="tabular text-right font-mono text-xs text-ink-2">{pct(loan.ratio)}</span>
                <span className="tabular text-right font-mono text-xs">{musd(loan.debt)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted">
          Darker fill shows what this redemption takes. {line.totalLoans.toLocaleString("en-US")} loans on Mezo testnet; the front {rows.length} are shown.
        </p>
      </div>
    </div>
  );
}
