import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Hosts the browser bundle talks to (listed from .next/static on 2026-11-06): Mezo RPCs,
// WalletConnect and Web3Modal for EVM wallets, Gelato as OrangeKit's relay for Bitcoin wallets.
// NEXT_PUBLIC_RPC_URL is the local fork in demo mode (env.ts refuses it outside development).
const rpcOverride = process.env.NEXT_PUBLIC_RPC_URL;
const dev = process.env.NODE_ENV !== "production";
const connectSrc = [
  "'self'",
  "https://rpc.test.mezo.org",
  "wss://rpc-ws.test.mezo.org",
  "https://mainnet.mezo.public.validationcloud.io",
  "https://mezo.drpc.org",
  "https://*.walletconnect.org",
  "wss://*.walletconnect.org",
  "https://*.walletconnect.com",
  "wss://*.walletconnect.com",
  "https://api.web3modal.org",
  "https://*.gelato.digital",
  ...(rpcOverride ? [rpcOverride] : []),
];
const csp = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; nonces would force every page to render dynamically.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "frame-src https://verify.walletconnect.org https://verify.walletconnect.com https://secure.walletconnect.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // The fork demo talks to http://127.0.0.1, which this would rewrite to https.
  ...(rpcOverride ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A lockfile in the home folder would otherwise be taken as the workspace root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Mezo Passport's OrangeKit packages publish TypeScript sources.
  transpilePackages: [
    "@mezo-org/passport",
    "@mezo-org/orangekit",
    "@mezo-org/orangekit-contracts",
    "@mezo-org/orangekit-smart-account",
  ],
  webpack: (config) => {
    // Node-only optional deps of WalletConnect and pino; never used in the browser.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // No Coinbase or Base wallet is offered. wagmi re-exports every connector: the Coinbase
    // SDK ships a worker Next 14 cannot minify, and Base Account pulls the CDP SDK, which
    // imports optional x402 packages. All resolve to empty modules.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/wallet-sdk": false,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      // MetaMask SDK's React Native storage path, never used in a browser.
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
