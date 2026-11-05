import { MUSD_ADDRESSES } from "@/lib/frontline/addresses";
import { explorerAddress } from "@/lib/mezo";
import { shortAddress } from "@/lib/format";

export function SiteFooter() {
  const a = MUSD_ADDRESSES.testnet;
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>Unaudited testnet software on Mezo. Built on Mezo&apos;s MUSD contracts.</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          <a className="underline" href={explorerAddress("testnet", a.troveManager)} target="_blank" rel="noreferrer">
            TroveManager {shortAddress(a.troveManager)}
          </a>
          <a className="underline" href={explorerAddress("testnet", a.sortedTroves)} target="_blank" rel="noreferrer">
            SortedTroves {shortAddress(a.sortedTroves)}
          </a>
          <a className="underline" href="https://github.com/whatsgood200/frontline-mezo" target="_blank" rel="noreferrer">
            Source code
          </a>
        </p>
      </div>
    </footer>
  );
}
