"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { mezoTestnet } from "@/lib/mezo";
import { Button } from "./ui/button";

/** Shows its children only to a wallet connected to Mezo testnet; otherwise says what to do. */
export function WalletGate({ children, purpose }: { children: (address: `0x${string}`) => ReactNode; purpose: string }) {
  const { address, isConnected, chainId, status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, isPending } = useSwitchChain();

  if (status === "connecting" || status === "reconnecting") {
    return <p className="text-sm text-muted">Checking your wallet…</p>;
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] border border-dashed border-line-strong p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wallet aria-hidden="true" size={16} /> Connect a wallet to {purpose}
        </p>
        <p className="text-sm text-ink-2">Bitcoin wallets (Unisat, OKX, Xverse) work through Mezo Passport, as do EVM wallets such as MetaMask.</p>
        <Button onClick={openConnectModal}>Connect wallet</Button>
      </div>
    );
  }

  if (chainId !== mezoTestnet.id) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] border border-warning/30 bg-warning-soft p-5">
        <p className="text-sm font-semibold">Your wallet is on another network</p>
        <p className="text-sm text-ink-2">Frontline runs on Mezo Testnet (chain 31611). Switch to continue.</p>
        <Button onClick={() => switchChain({ chainId: mezoTestnet.id })} disabled={isPending}>
          {isPending ? "Switching…" : "Switch to Mezo Testnet"}
        </Button>
      </div>
    );
  }

  return <>{children(address)}</>;
}
