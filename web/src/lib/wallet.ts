import { injectedWallet, metaMaskWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, type Config } from "wagmi";
// Imported file by file: the Passport package index also loads a UI kit that starts a
// Styletron engine against `document` at import time and breaks server rendering.
import {
  getConfig,
  okxWalletMezoTestnet,
  unisatWalletMezoTestnet,
  xverseWalletMezoTestnet,
} from "@mezo-org/passport/dist/src/config";
import { mezoTestnet } from "@/lib/mezo";
import { env } from "@/lib/env";
import { demoWallet } from "@/lib/demo-wallet";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/**
 * Mezo Passport offers Bitcoin wallets (Unisat, OKX, Xverse) next to EVM wallets.
 * Passport's Bitcoin wallets read `window` when listed, so the server gets a wallet-less
 * config; wagmi starts disconnected either way, so server and first client render match.
 */
export function createWagmiConfig(): Config {
  if (typeof window === "undefined") {
    return createConfig({ chains: [mezoTestnet], transports: { [mezoTestnet.id]: http() }, ssr: true });
  }
  // WalletConnect wallets refuse to start without a project id; injected discovery covers MetaMask, Rabby and others.
  const evmWallets = projectId ? [metaMaskWallet, walletConnectWallet] : [injectedWallet];
  return getConfig({
    appName: "Frontline",
    appDescription: "A redemption market for MUSD on Mezo",
    appUrl: window.location.origin,
    mezoNetwork: "testnet",
    walletConnectProjectId: projectId,
    wallets: [
      { groupName: "Bitcoin", wallets: [unisatWalletMezoTestnet, okxWalletMezoTestnet, xverseWalletMezoTestnet] },
      { groupName: "Ethereum", wallets: evmWallets },
      ...(env.adapter === "mock" ? [{ groupName: "Preview only", wallets: [demoWallet] }] : []),
    ],
    ssr: true,
  });
}
