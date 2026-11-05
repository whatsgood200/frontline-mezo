"use client";

import { CheckCircle2, ExternalLink, Loader2, PenLine, XCircle } from "lucide-react";
import type { TxStatus } from "@/lib/frontline";
import { explorerTx } from "@/lib/mezo";
import { env } from "@/lib/env";
import { cn } from "@/lib/format";

/** Renders every state of a write so the user always knows what is happening. */
export function TxStatusView({ status, onDismiss }: { status: TxStatus; onDismiss?: () => void }) {
  if (status.state === "idle") return null;

  const hash = "hash" in status ? status.hash : null;
  const tone = {
    "awaiting-signature": "border-line bg-sunken",
    pending: "border-protected/30 bg-protected-soft",
    confirmed: "border-success/30 bg-success-soft",
    reverted: "border-danger/30 bg-danger-soft",
    rejected: "border-line bg-sunken",
    failed: "border-danger/30 bg-danger-soft",
  }[status.state];

  const icon = {
    "awaiting-signature": <PenLine aria-hidden="true" size={16} />,
    pending: <Loader2 aria-hidden="true" size={16} className="animate-spin" />,
    confirmed: <CheckCircle2 aria-hidden="true" size={16} className="text-success" />,
    reverted: <XCircle aria-hidden="true" size={16} className="text-danger" />,
    rejected: <XCircle aria-hidden="true" size={16} className="text-muted" />,
    failed: <XCircle aria-hidden="true" size={16} className="text-danger" />,
  }[status.state];

  const text = {
    "awaiting-signature": "Confirm in your wallet.",
    pending: "Sent. Waiting for Mezo to include it in a block.",
    confirmed: `Confirmed on ${env.forkDemo ? "the local fork of Mezo testnet" : "Mezo testnet"}. The numbers above are re-read from the chain.`,
    reverted: `The transaction reverted, so nothing changed. Reason: ${"reason" in status ? status.reason : "unknown"}.`,
    rejected: "You declined in your wallet. Nothing was sent.",
    failed: "reason" in status ? status.reason : "Nothing was sent.",
  }[status.state];

  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-1.5 rounded-[var(--radius-control)] border p-3 text-sm", tone)}>
      <p className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span>{text}</span>
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
        {hash && env.forkDemo ? (
          // Fork transactions exist only on the local fork, so the public explorer has no page for them.
          <span className="font-mono text-xs">
            {hash.slice(0, 10)}…{hash.slice(-6)}
          </span>
        ) : hash ? (
          <a href={explorerTx("testnet", hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs underline">
            {hash.slice(0, 10)}…{hash.slice(-6)} <ExternalLink aria-hidden="true" size={12} />
          </a>
        ) : null}
        {onDismiss && (status.state === "confirmed" || status.state === "rejected" || status.state === "reverted" || status.state === "failed") ? (
          <button type="button" onClick={onDismiss} className="text-xs font-semibold text-ink-2 underline">
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
