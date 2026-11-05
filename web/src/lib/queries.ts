"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { DEMO_BALANCES, DEMO_CONNECTOR_ID } from "@/lib/demo-wallet";
import { MUSD_ADDRESSES } from "@/lib/frontline/addresses";
import { mezoTestnet } from "@/lib/mezo";
import { frontline, type BorrowInput } from "@/lib/frontline";
import { env } from "@/lib/env";

// Every screen reads through these hooks; writes go through useTx, which refetches them.

export const useLine = () => useQuery({ queryKey: ["line", env.network], queryFn: () => frontline.getLine(env.network) });
export const useMainnetStats = () => useQuery({ queryKey: ["mainnet-stats"], queryFn: () => frontline.getMainnetStats(), staleTime: 300_000 });
export const useVault = () => useQuery({ queryKey: ["vault"], queryFn: () => frontline.getVault() });
export const useActivity = () => useQuery({ queryKey: ["activity"], queryFn: () => frontline.getActivity() });
export const useKeeperLog = () => useQuery({ queryKey: ["keeper"], queryFn: () => frontline.getKeeperLog() });

export const useLoan = (owner: `0x${string}` | undefined) =>
  useQuery({ queryKey: ["loan", owner], queryFn: () => frontline.getLoan(owner!), enabled: !!owner });

export const useAbsorber = (owner: `0x${string}` | undefined) =>
  useQuery({ queryKey: ["absorber", owner], queryFn: () => frontline.getAbsorber(owner!), enabled: !!owner });

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useBorrowQuote(input: BorrowInput | null) {
  const debounced = useDebounced(input);
  return useQuery({
    queryKey: ["quote-borrow", debounced],
    queryFn: () => frontline.quoteBorrow(debounced!),
    enabled: !!debounced,
    placeholderData: (prev) => prev,
  });
}

export function useAbsorbQuote(btc: number | null) {
  const debounced = useDebounced(btc);
  return useQuery({
    queryKey: ["quote-absorb", debounced],
    queryFn: () => frontline.quoteAbsorb(debounced!),
    enabled: debounced !== null && debounced > 0,
    placeholderData: (prev) => prev,
  });
}

export function useRedemptionPreview(amount: number | null) {
  const debounced = useDebounced(amount);
  return useQuery({
    queryKey: ["preview-redemption", debounced],
    queryFn: () => frontline.previewRedemption(debounced!),
    enabled: debounced !== null && debounced > 0,
    placeholderData: (prev) => prev,
  });
}

/** Native BTC in the connected wallet (Mezo testnet). The preview-only demo wallet reports a fixed balance. */
export function useWalletBtc(): number | undefined {
  const { address, connector } = useAccount();
  const demo = connector?.id === DEMO_CONNECTOR_ID;
  const bal = useBalance({ address, chainId: mezoTestnet.id, query: { enabled: !!address && !demo } });
  if (demo) return DEMO_BALANCES.btc;
  return bal.data ? Number(bal.data.value) / 1e18 : undefined;
}

/** MUSD in the connected wallet (Mezo testnet). */
export function useWalletMusd(): number | undefined {
  const { address, connector } = useAccount();
  const demo = connector?.id === DEMO_CONNECTOR_ID;
  const bal = useReadContract({
    address: MUSD_ADDRESSES.testnet.musd,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: mezoTestnet.id,
    query: { enabled: !!address && !demo },
  });
  if (demo) return DEMO_BALANCES.musd;
  return bal.data !== undefined ? Number(bal.data) / 1e18 : undefined;
}
