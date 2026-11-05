import { AlertTriangle, Construction, Inbox, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { NotDeployedError } from "@/lib/frontline";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-sunken", className)} />;
}

export function LoadingBlock({ label, lines = 4 }: { label: string; lines?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-5", i % 2 ? "w-3/4" : "w-full")} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof NotDeployedError) return <NotDeployedState message={error.message} />;
  const message = error instanceof Error ? error.message : "Something went wrong reading Mezo.";
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-danger">
        <AlertTriangle aria-hidden="true" size={16} /> Could not load this
      </p>
      <p className="text-sm text-ink-2">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" size={14} /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function NotDeployedState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-warning/30 bg-warning-soft p-4">
      <Construction aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-sm text-ink-2">{message}</p>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] border border-dashed border-line-strong p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Inbox aria-hidden="true" size={16} className="text-muted" /> {title}
      </p>
      <div className="text-sm text-ink-2">{children}</div>
      {action}
    </div>
  );
}
