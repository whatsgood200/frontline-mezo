import { defineChain } from "viem";

// Chain facts from https://mezo.org/docs/developers/getting-started (checked 2026-11-05).
export const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.test.mezo.org"], webSocket: ["wss://rpc-ws.test.mezo.org"] },
  },
  blockExplorers: { default: { name: "Mezo Explorer", url: "https://explorer.test.mezo.org" } },
  testnet: true,
});

export const mezoMainnet = defineChain({
  id: 31612,
  name: "Mezo",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://mainnet.mezo.public.validationcloud.io", "https://mezo.drpc.org"],
    },
  },
  blockExplorers: { default: { name: "Mezo Explorer", url: "https://explorer.mezo.org" } },
});

export type Network = "testnet" | "mainnet";

export const chains = { testnet: mezoTestnet, mainnet: mezoMainnet } as const;

export function explorerTx(network: Network, hash: string): string {
  return `${chains[network].blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddress(network: Network, address: string): string {
  return `${chains[network].blockExplorers.default.url}/address/${address}`;
}
