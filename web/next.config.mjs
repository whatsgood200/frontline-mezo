import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const securityHeaders = [
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
