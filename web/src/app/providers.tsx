"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { SignerBridge } from "@/components/signer-bridge";
import { createWagmiConfig } from "@/lib/wallet";
import { mezoTestnet } from "@/lib/mezo";

const theme = lightTheme({ accentColor: "#12161c", accentColorForeground: "#ffffff", borderRadius: "medium", fontStack: "system" });

export function Providers({ children }: { children: ReactNode }) {
  const [wagmiConfig] = useState(createWagmiConfig);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } } }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={mezoTestnet} theme={theme}>
          <SignerBridge />
          {children}
          <Toaster position="top-center" closeButton richColors />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
