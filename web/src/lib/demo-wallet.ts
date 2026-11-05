import type { Wallet } from "@rainbow-me/rainbowkit";
import { createConnector, mock } from "wagmi";

// Preview builds (mock adapter): a wallet that signs nothing, so reviewers can click through every
// flow without testnet funds. Local fork demo: the same wallet sends real transactions to anvil.
// Never offered on a deployed chain build.

/** Mock builds: an address that signs nothing. Fork demo: anvil's first dev account, which anvil signs for. */
export const DEMO_ADDRESS =
  process.env.NEXT_PUBLIC_FORK_DEMO === "1"
    ? ("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const)
    : ("0xF20b000000000000000000000000000000de0001" as const);
export const DEMO_CONNECTOR_ID = "frontline-demo";
export const DEMO_BALANCES = { btc: 2.5, musd: 50_000 };

const icon =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" rx="7" fill="#12161c"/><rect x="6" y="8" width="16" height="3" rx="1.5" fill="#f07a2e"/><rect x="6" y="13" width="16" height="3" rx="1.5" fill="#6b7380"/><rect x="6" y="18" width="16" height="3" rx="1.5" fill="#5b8ee6"/></svg>');

export const demoWallet = (): Wallet => ({
  id: DEMO_CONNECTOR_ID,
  name: process.env.NEXT_PUBLIC_FORK_DEMO === "1" ? "Fork demo wallet" : "Demo wallet (preview)",
  iconUrl: icon,
  iconBackground: "#12161c",
  installed: true,
  createConnector: (walletDetails) =>
    createConnector((config) => ({
      // defaultConnected lets wagmi restore it after a reload, but only when the demo
      // wallet was the last one used (wagmi reconnects the stored recent connector only).
      ...mock({ accounts: [DEMO_ADDRESS], features: { reconnect: true, defaultConnected: true } })(config),
      ...walletDetails,
      id: DEMO_CONNECTOR_ID,
      name: process.env.NEXT_PUBLIC_FORK_DEMO === "1" ? "Fork demo wallet" : "Demo wallet (preview)",
    })),
});
