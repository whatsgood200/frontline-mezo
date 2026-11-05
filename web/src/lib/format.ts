import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function musd(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function btc(n: number, digits = 4): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function pct(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "n/a";
  return `${(ratio * 100).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function multiple(x: number): string {
  if (!Number.isFinite(x)) return "no protected debt";
  return `${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
}

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** Parses a user-typed amount; returns NaN for anything that is not a plain positive number. */
export function parseAmount(raw: string): number {
  const clean = raw.replace(/,/g, "").trim();
  if (!/^\d*\.?\d+$/.test(clean)) return Number.NaN;
  return Number(clean);
}
