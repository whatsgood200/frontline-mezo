"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FrontlineError, NotDeployedError, type OnTxStatus, type TxResult, type TxStatus } from "@/lib/frontline";

/**
 * Runs one write through the TxStatus state machine:
 * idle -> awaiting-signature -> pending -> confirmed | reverted | rejected | failed.
 * On success it refetches every query, so the UI only ever shows confirmed state.
 */
export function useTx() {
  const [status, setStatus] = useState<TxStatus>({ state: "idle" });
  const busy = useRef(false);
  const queryClient = useQueryClient();

  const run = useCallback(
    async (label: string, send: (onStatus: OnTxStatus) => Promise<TxResult>) => {
      if (busy.current) return;
      busy.current = true;
      // Held in an object so TypeScript does not narrow it across the async boundary.
      const seen: { last: TxStatus } = { last: { state: "idle" } };
      const report: OnTxStatus = (s) => {
        seen.last = s;
        setStatus(s);
      };
      try {
        await send(report);
        toast.success(`${label}: confirmed`);
        await queryClient.invalidateQueries();
      } catch (err) {
        if (seen.last.state === "rejected" || seen.last.state === "reverted") return;
        if (err instanceof NotDeployedError || err instanceof FrontlineError) {
          setStatus({ state: "failed", reason: err.message });
          return;
        }
        console.error(`${label} failed`, err);
        setStatus({ state: "failed", reason: "Something went wrong sending this transaction. Nothing changed. Try again." });
      } finally {
        busy.current = false;
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => setStatus({ state: "idle" }), []);
  const inFlight = status.state === "awaiting-signature" || status.state === "pending";
  return { status, run, reset, inFlight };
}
