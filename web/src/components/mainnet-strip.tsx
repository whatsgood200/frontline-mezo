"use client";

import { useMainnetStats } from "@/lib/queries";
import { btc, musd } from "@/lib/format";
import { Skeleton } from "./ui/states";

/** The problem in Mezo's own numbers (real mainnet events). */
export function MainnetStrip() {
  const { data, isLoading, isError } = useMainnetStats();
  if (isError) return null;
  return (
    <section aria-labelledby="mainnet-title" className="rounded-[var(--radius-card)] bg-ink p-6 text-page sm:p-7">
      <h2 id="mainnet-title" className="mb-5 text-sm font-semibold text-[#c3c8d0]">
        Why the line matters: Mezo mainnet, all time
      </h2>
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 bg-white/10" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <div>
              <dt className="sr-only">Loans hit by redemption</dt>
              <dd className="tabular font-mono text-3xl font-semibold text-[#f7a06a] sm:text-4xl">{musd(data.troveHitsByRedemption)}</dd>
              <dd className="mt-1 text-sm text-[#c3c8d0]">loans hit by redemption</dd>
            </div>
            <div>
              <dt className="sr-only">Loans hit by liquidation</dt>
              <dd className="tabular font-mono text-3xl font-semibold sm:text-4xl">{musd(data.troveHitsByLiquidation)}</dd>
              <dd className="mt-1 text-sm text-[#c3c8d0]">hit by liquidation</dd>
            </div>
            <div>
              <dt className="sr-only">BTC taken by redemptions</dt>
              <dd className="tabular font-mono text-3xl font-semibold sm:text-4xl">{btc(data.btcTaken, 1)} BTC</dd>
              <dd className="mt-1 text-sm text-[#c3c8d0]">taken from {data.borrowersRedeemed} borrowers</dd>
            </div>
            <div>
              <dt className="sr-only">Loans still open</dt>
              <dd className="tabular font-mono text-3xl font-semibold sm:text-4xl">{data.openLoans}</dd>
              <dd className="mt-1 text-sm text-[#c3c8d0]">loans still open</dd>
            </div>
          </dl>
          <p className="mt-5 font-mono text-[11px] text-[#9aa1ab]">
            {data.source} · as of {new Date(data.asOf).toUTCString().slice(5, 22)} UTC · MUSD trades at ${data.musdPrice.toFixed(3)}
          </p>
        </>
      )}
    </section>
  );
}
