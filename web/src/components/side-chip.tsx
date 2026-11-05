import type { Side } from "@/lib/frontline";
import { cn } from "@/lib/format";

const styles: Record<Side, string> = {
  absorber: "bg-absorber-chip text-ink",
  protected: "bg-protected text-white",
  other: "border border-line-strong text-ink-2",
};

const labels: Record<Side, string> = { absorber: "Absorber", protected: "Protected", other: "Other loan" };

export function SideChip({ side, className }: { side: Side; className?: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", styles[side], className)}>{labels[side]}</span>;
}

export const sideFill: Record<Side, string> = { absorber: "bg-absorber", protected: "bg-protected", other: "bg-other" };
export const sideRest: Record<Side, string> = { absorber: "bg-absorber-rest", protected: "bg-protected-rest", other: "bg-other-rest" };
