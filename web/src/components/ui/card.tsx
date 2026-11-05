import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-base font-semibold">
        {children}
      </h2>
      {aside ? <div className="font-mono text-xs text-muted">{aside}</div> : null}
    </div>
  );
}

export function Row({ label, value, strong, hint }: { label: ReactNode; value: ReactNode; strong?: boolean; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <span className="text-sm text-ink-2">
        {label}
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
      <span className={cn("tabular text-right text-sm", strong ? "text-base font-bold" : "font-semibold")}>{value}</span>
    </div>
  );
}
