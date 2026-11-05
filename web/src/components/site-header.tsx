"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/", label: "Line" },
  { href: "/borrow", label: "Borrow" },
  { href: "/loan", label: "My loan" },
  { href: "/absorb", label: "Absorb" },
  { href: "/position", label: "My position" },
  { href: "/lab", label: "Redeem Lab" },
  { href: "/proof", label: "Proof" },
];

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#12161c" />
      <rect x="6" y="8" width="16" height="3" rx="1.5" fill="#f07a2e" />
      <rect x="6" y="13" width="16" height="3" rx="1.5" fill="#6b7380" />
      <rect x="6" y="18" width="16" height="3" rx="1.5" fill="#5b8ee6" />
    </svg>
  );
}

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold" aria-label="Frontline home">
          <Logo /> Frontline
        </Link>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] md:order-none md:w-auto md:flex-1 md:pb-0">
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2.5 text-sm",
                  active ? "bg-sunken font-semibold text-ink" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full bg-sunken px-2.5 py-1.5 font-mono text-xs text-muted sm:inline">Mezo Testnet</span>
          <ConnectButton label="Connect wallet" accountStatus="address" chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
