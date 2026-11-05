import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "protected" | "absorber" | "outline" | "ghost" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2",
  protected: "bg-protected text-white hover:bg-protected-ink",
  absorber: "bg-absorber-chip text-ink hover:bg-absorber",
  outline: "border border-line-strong bg-surface text-ink hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-[15px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
