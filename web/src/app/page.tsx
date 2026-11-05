import Link from "next/link";

const screens = [
  { href: "/borrow", label: "Borrow with protection" },
  { href: "/loan", label: "My loan" },
  { href: "/absorb", label: "Earn as an absorber" },
  { href: "/position", label: "My absorber position" },
  { href: "/lab", label: "Redeem Lab" },
  { href: "/proof", label: "Proof" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Frontline</h1>
      <p className="mt-2 text-sm text-neutral-600">
        On Mezo mainnet, redemptions hit MUSD loans 1,310 times and liquidations 28 times. Frontline puts a paid
        layer of willing loans at the front of the redemption line.
      </p>
      <nav className="mt-6 grid gap-2">
        {screens.map((s) => (
          <Link key={s.href} href={s.href} className="rounded border px-3 py-2 text-sm hover:bg-neutral-50">
            {s.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
