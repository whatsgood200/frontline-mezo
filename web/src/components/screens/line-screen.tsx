"use client";

import { MainnetStrip } from "@/components/mainnet-strip";
import { QueuePreview } from "@/components/queue-preview";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { useLine, useVault } from "@/lib/queries";
import { bufferAhead } from "@/lib/frontline/math";
import { FRONTLINE, MUSD } from "@/lib/frontline/params";
import { musd, pct } from "@/lib/format";

const STEPS = [
  { n: "01", title: "Someone redeems MUSD", body: "They hand in MUSD and take BTC at the oracle price, minus a 0.75% fee.", code: "TroveManager.redeemCollateral" },
  { n: "02", title: "MUSD starts at the front", body: "The lowest-ratio loan goes first. Nobody can skip ahead.", code: "SortedTroves.getLast" },
  { n: "03", title: "Absorbers take the hit", body: "Their BTC turns into dollars at the oracle price. Protected loans do not move.", code: "AbsorberVault" },
  { n: "04", title: "The buffer is rebuilt", body: "A keeper, or anyone, rearms the absorber loans back to the band.", code: "AbsorberVault.rearm" },
  { n: "05", title: "Protected loans pay for it", body: "A premium streams from protected loans to absorbers in MUSD.", code: "ProtectedLoan.collectPremium" },
];

export function LineScreen() {
  const line = useLine();
  const vault = useVault();
  const buffer = line.data ? bufferAhead(line.data.loans, FRONTLINE.protectionFloor) : null;

  return (
    <div className="flex flex-col gap-12">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="font-mono text-xs tracking-[0.14em] text-muted">MUSD REDEMPTION LINE · MEZO TESTNET</p>
        <h1 className="text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl">See where a redemption stops.</h1>
        <p className="text-[17px] leading-relaxed text-ink-2">
          A redemption takes BTC from the MUSD loan with the lowest collateral ratio first. Frontline keeps paid absorber loans
          (orange) at the front of that line, so protected loans (blue) are reached last.
        </p>
      </section>

      {line.isLoading ? (
        <LoadingBlock label="Reading the redemption line from Mezo" lines={6} />
      ) : line.isError ? (
        <ErrorState error={line.error} onRetry={() => line.refetch()} />
      ) : line.data ? (
        <QueuePreview line={line.data} />
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <span className="self-start rounded-md bg-protected px-2 py-1 text-xs font-semibold text-white">Protected borrower</span>
          <p className="text-[22px] font-bold leading-snug">
            Borrow at Mezo&apos;s {pct(MUSD.interestRate, 0)}
            {buffer && buffer.total > 0 ? <>, behind {buffer.reachedEnd && line.data!.totalLoans > line.data!.loans.length ? "more than " : ""}{musd(buffer.total)} MUSD of buffer.</> : <>, behind the absorber layer.</>}
          </p>
          <p className="text-[15px] leading-relaxed text-ink-2">
            You keep a normal MUSD loan on Mezo. Frontline keeps it above the absorber layer and shows exactly how much must be redeemed
            before anyone reaches it.
            {vault.data && vault.data.premiumRate > 0 ? <> The premium is {pct(vault.data.premiumRate, 2)} a year right now.</> : null}
          </p>
          <ButtonLink href="/borrow" variant="protected" size="lg" className="self-start">
            Borrow with protection
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <span className="self-start rounded-md bg-absorber-chip px-2 py-1 text-xs font-semibold text-ink">Absorber</span>
          <p className="text-[22px] font-bold leading-snug">
            {vault.data && vault.data.absorberYieldOnBtc > 0 ? <>Earn about {pct(vault.data.absorberYieldOnBtc)} on BTC for standing first.</> : <>Earn a premium for standing first.</>}
          </p>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Your BTC backs loans at the front of the line. When redemptions arrive, part of it turns into MUSD at the oracle price, with no
            loss in dollar value. veBTC pays {pct(FRONTLINE.veBtcYield, 2)} today.
          </p>
          <ButtonLink href="/absorb" variant="absorber" size="lg" className="self-start">
            Earn as an absorber
          </ButtonLink>
        </div>
      </section>

      <MainnetStrip />

      <section aria-labelledby="steps-title" className="flex flex-col gap-5">
        <h2 id="steps-title" className="text-2xl font-semibold tracking-tight">
          How a redemption moves through the line
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-line bg-surface p-4">
              <span className="font-mono text-xs text-subtle">{s.n}</span>
              <span className="font-semibold">{s.title}</span>
              <span className="text-sm leading-relaxed text-ink-2">{s.body}</span>
              <code className="mt-auto font-mono text-xs text-absorber-ink">{s.code.replace(".", ".\u200B")}</code>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
