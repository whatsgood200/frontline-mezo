import type { LineLoan, RedemptionStep } from "@/lib/frontline";
import { explorerAddress } from "@/lib/mezo";
import { cn, musd, pct } from "@/lib/format";
import { SideChip } from "./side-chip";

/**
 * The redemption line as an exact table, front first (Direction A's board).
 * Optional `taken` highlights what a redemption takes from each loan.
 */
export function LineBoard({ loans, taken, caption }: { loans: LineLoan[]; taken?: RedemptionStep[]; caption: string }) {
  const takenAt = new Map((taken ?? []).map((s) => [s.position, s.taken]));
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full min-w-[720px] border-collapse font-mono text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-[11px] tracking-[0.08em] text-muted">
            <th scope="col" className="border-b border-line px-4 py-3 font-medium">#</th>
            <th scope="col" className="border-b border-line px-4 py-3 font-medium">LOAN</th>
            <th scope="col" className="border-b border-line px-4 py-3 font-medium">SIDE</th>
            <th scope="col" className="border-b border-line px-4 py-3 text-right font-medium">RATIO</th>
            <th scope="col" className="border-b border-line px-4 py-3 text-right font-medium">DEBT, MUSD</th>
            <th scope="col" className="border-b border-line px-4 py-3 text-right font-medium">REDEEMED BEFORE IT</th>
            {taken ? <th scope="col" className="border-b border-line px-4 py-3 text-right font-medium">THIS REDEMPTION TAKES</th> : null}
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const t = takenAt.get(loan.position) ?? 0;
            return (
              <tr key={loan.address} className={cn("border-t border-line first:border-t-0", loan.position === 1 && "bg-absorber-soft/60")}>
                <td className="px-4 py-3 text-subtle">{loan.position}</td>
                <td className="px-4 py-3">
                  <a href={explorerAddress("testnet", loan.address)} target="_blank" rel="noreferrer" className="hover:underline">
                    {loan.label}
                  </a>
                </td>
                <td className="px-4 py-3 font-sans">
                  <SideChip side={loan.side} />
                </td>
                <td className="tabular px-4 py-3 text-right">{pct(loan.ratio)}</td>
                <td className="tabular px-4 py-3 text-right">{musd(loan.debt)}</td>
                <td className="tabular px-4 py-3 text-right text-ink-2">{musd(loan.redeemedBefore)}</td>
                {taken ? (
                  <td className={cn("tabular px-4 py-3 text-right font-semibold", t > 0 ? (loan.side === "protected" ? "text-danger" : "text-absorber-ink") : "text-subtle")}>
                    {t > 0 ? musd(t) : "0"}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
