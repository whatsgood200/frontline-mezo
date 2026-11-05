import { Info } from "lucide-react";
import type { LineSnapshot } from "@/lib/frontline";
import { frontStatus } from "@/lib/frontline/front";
import { musd, pct } from "@/lib/format";

/** Says plainly when other loans sit ahead of the absorber layer, and why Redeem Lab waits. */
export function FrontNotice({ line }: { line: LineSnapshot }) {
  const s = frontStatus(line.loans);
  if (!line.frontlineLive || s.othersAhead === 0) return null;
  const hasAbsorbers = line.absorberDebt > 0;
  return (
    <div role="status" className="flex items-start gap-3 rounded-[var(--radius-control)] border border-protected/30 bg-protected-soft p-4 text-sm">
      <Info aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-protected" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-protected-ink">
          {s.othersAhead} other testnet {s.othersAhead === 1 ? "loan sits" : "loans sit"} ahead of the absorber layer ({musd(s.musdAhead)} MUSD).
        </p>
        <p className="text-ink-2">
          {hasAbsorbers ? "Absorber loans are deployed behind them." : "No absorber loans are deployed yet."} Their lowest ratio is{" "}
          {s.lowestRatio !== null ? pct(s.lowestRatio) : "n/a"}, above our band floor, so a redemption would reach them first. Redeem Lab
          runs only redemptions that stop inside the absorber layer, so it waits until they clear (MUSD liquidates loans under 110%). The
          same flow runs end to end on a fork in our tests.
        </p>
      </div>
    </div>
  );
}
