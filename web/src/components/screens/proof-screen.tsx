"use client";

import { ExternalLink } from "lucide-react";
import { LineBoard } from "@/components/line-board";
import { MainnetStrip } from "@/components/mainnet-strip";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/states";
import { FRONTLINE_ADDRESSES, MUSD_ADDRESSES } from "@/lib/frontline/addresses";
import { useActivity, useKeeperLog, useLine } from "@/lib/queries";
import { explorerAddress, explorerTx } from "@/lib/mezo";
import { shortAddress, timeAgo } from "@/lib/format";

const MUSD_ROWS: [string, `0x${string}`][] = [
  ["TroveManager", MUSD_ADDRESSES.testnet.troveManager],
  ["SortedTroves", MUSD_ADDRESSES.testnet.sortedTroves],
  ["BorrowerOperations", MUSD_ADDRESSES.testnet.borrowerOperations],
  ["HintHelpers", MUSD_ADDRESSES.testnet.hintHelpers],
  ["PriceFeed", MUSD_ADDRESSES.testnet.priceFeed],
  ["MUSD", MUSD_ADDRESSES.testnet.musd],
];

const PROVEN = [
  { ok: true, text: "MUSD redeems from the lowest nominal ratio upward and a redeemer cannot skip ahead (TroveManager.redeemCollateral, _isValidFirstRedemptionHint)." },
  { ok: true, text: "A contract can own and manage a trove on Mezo testnet: open with hints at about 526k gas, adjust, close (fork test S1)." },
  { ok: true, text: "A real redemption hits an absorber loan and leaves a protected loan's collateral and debt unchanged (fork test S2)." },
  { ok: true, text: "After a 3% BTC drop, repaying from held MUSD lifts an absorber loan from 111% back to 125% (fork test S5)." },
  { ok: true, text: "Frontline is deployed on Mezo testnet (block 16,591,000); the vault, factory and lens are source-verified on the explorer, and the loan template's bytecode matches the build exactly." },
  { ok: true, text: "35 contract tests pass, including 24 end-to-end fork tests against the real MUSD contracts (deposit, protected loans, redemption, premiums, withdrawals, price shocks)." },
  { ok: false, text: "Outside users: none yet. Wallet addresses will be listed here with explorer links." },
  { ok: false, text: "Audit: none. Unaudited testnet software." },
];

export function ProofScreen() {
  const activity = useActivity();
  const keeper = useKeeperLog();
  const line = useLine();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Proof</h1>
        <p className="text-ink-2">Every number on this site traces to a contract, an event or a test. Here is where each one comes from.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="contracts-title">
          <CardTitle id="contracts-title" aside="Mezo testnet · 31611">
            Contracts
          </CardTitle>
          <ul className="flex flex-col">
            {MUSD_ROWS.map(([name, addr]) => (
              <li key={name} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
                <span className="text-sm">{name} <span className="text-xs text-muted">(Mezo)</span></span>
                <a href={explorerAddress("testnet", addr)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline">
                  {shortAddress(addr)} <ExternalLink aria-hidden="true" size={12} />
                </a>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-b border-line py-2.5">
              <span className="text-sm">AbsorberVault <span className="text-xs text-muted">(Frontline)</span></span>
              <span className="font-mono text-xs text-muted">{FRONTLINE_ADDRESSES.absorberVault ? shortAddress(FRONTLINE_ADDRESSES.absorberVault) : "not deployed"}</span>
            </li>
            <li className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm">ProtectedLoanFactory <span className="text-xs text-muted">(Frontline)</span></span>
              <span className="font-mono text-xs text-muted">{FRONTLINE_ADDRESSES.loanFactory ? shortAddress(FRONTLINE_ADDRESSES.loanFactory) : "not deployed"}</span>
            </li>
          </ul>
        </Card>

        <Card aria-labelledby="proven-title">
          <CardTitle id="proven-title">What is proven, and what is not</CardTitle>
          <ul className="flex flex-col gap-2.5">
            {PROVEN.map((p) => (
              <li key={p.text} className="flex gap-2.5 text-sm">
                <span aria-hidden="true" className={p.ok ? "text-success" : "text-warning"}>{p.ok ? "✓" : "○"}</span>
                <span><span className="sr-only">{p.ok ? "Proven: " : "Not yet: "}</span>{p.text}</span>
              </li>
            ))}
          </ul>
          <a href="https://github.com/whatsgood200/frontline-mezo/blob/main/docs/spikes.md" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm underline">
            Spike results and how to re-run them <ExternalLink aria-hidden="true" size={12} />
          </a>
        </Card>
      </div>

      <Card aria-labelledby="activity-title">
        <CardTitle id="activity-title">Frontline transactions</CardTitle>
        {activity.isLoading ? (
          <LoadingBlock label="Reading transactions" />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
        ) : !activity.data?.length ? (
          <EmptyState title="No Frontline transactions yet">They appear here, with explorer links, as soon as the contracts are live and someone uses them.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Frontline transactions, newest first</caption>
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="pb-2 font-medium">When</th>
                  <th scope="col" className="pb-2 font-medium">What happened</th>
                  <th scope="col" className="pb-2 font-medium">Account</th>
                  <th scope="col" className="pb-2 text-right font-medium">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {activity.data.map((a) => (
                  <tr key={a.hash} className="border-t border-line align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{timeAgo(a.at)}</td>
                    <td className="py-2.5 pr-3">{a.summary}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{shortAddress(a.account)}</td>
                    <td className="py-2.5 text-right">
                      <a href={explorerTx("testnet", a.hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline">
                        {a.hash.slice(0, 10)}… <ExternalLink aria-hidden="true" size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card aria-labelledby="keeper-title">
        <CardTitle id="keeper-title" aside="anyone can run these calls">
          Keeper log
        </CardTitle>
        {keeper.isLoading ? (
          <LoadingBlock label="Reading the keeper log" lines={3} />
        ) : keeper.isError ? (
          <ErrorState error={keeper.error} onRetry={() => keeper.refetch()} />
        ) : !keeper.data?.length ? (
          <EmptyState title="No keeper runs yet">The keeper starts with the contracts in Phase 3. Every run, including the ones that change nothing, is logged here.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {keeper.data.map((k) => (
              <li key={k.at} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-2.5 text-sm last:border-b-0">
                <span className="w-20 shrink-0 text-muted">{timeAgo(k.at)}</span>
                <code className="w-32 shrink-0 font-mono text-xs text-absorber-ink">{k.action}</code>
                <span className="min-w-0 flex-1">{k.detail}</span>
                {k.hash ? (
                  <a href={explorerTx("testnet", k.hash)} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
                    {k.hash.slice(0, 10)}…
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MainnetStrip />

      <section aria-labelledby="line-title" className="flex flex-col gap-3">
        <h2 id="line-title" className="text-xl font-semibold">The whole line, front first</h2>
        {line.isLoading ? (
          <LoadingBlock label="Reading the line" lines={8} />
        ) : line.isError ? (
          <ErrorState error={line.error} onRetry={() => line.refetch()} />
        ) : line.data ? (
          <>
            <LineBoard loans={line.data.loans} caption="Mezo testnet redemption line" />
            <p className="font-mono text-xs text-muted">
              Read from SortedTroves and TroveManager at block {line.data.block.toLocaleString("en-US")} · {timeAgo(line.data.readAt)} · BTC ${line.data.btcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })} from PriceFeed
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
