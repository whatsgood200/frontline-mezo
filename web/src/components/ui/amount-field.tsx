"use client";

import { useId } from "react";
import { cn } from "@/lib/format";

export function AmountField({
  label,
  unit,
  value,
  onChange,
  error,
  hint,
  onMax,
  disabled,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: string;
  onMax?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center rounded-[var(--radius-control)] border bg-surface pr-2 focus-within:border-protected",
          error ? "border-danger" : "border-line-strong",
        )}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="tabular min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-lg outline-none"
        />
        <span className="px-1 text-sm font-semibold text-muted">{unit}</span>
        {onMax ? (
          <button type="button" onClick={onMax} disabled={disabled} className="ml-1 min-h-9 rounded-md px-2 text-xs font-semibold text-protected hover:bg-protected-soft">
            Max
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
