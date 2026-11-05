import type { Network } from "./mezo";

export type AdapterKind = "mock" | "chain";

function readAdapter(): AdapterKind {
  const value = process.env.NEXT_PUBLIC_ADAPTER ?? "mock";
  if (value !== "mock" && value !== "chain") {
    throw new Error(`NEXT_PUBLIC_ADAPTER must be "mock" or "chain", got "${value}"`);
  }
  return value;
}

function readNetwork(): Network {
  const value = process.env.NEXT_PUBLIC_NETWORK ?? "testnet";
  if (value !== "testnet" && value !== "mainnet") {
    throw new Error(`NEXT_PUBLIC_NETWORK must be "testnet" or "mainnet", got "${value}"`);
  }
  return value;
}

export const env = {
  adapter: readAdapter(),
  network: readNetwork(),
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  deployEnv: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
  /** Local fork demo: chain adapter against an anvil fork, with an anvil dev wallet. */
  forkDemo: process.env.NEXT_PUBLIC_FORK_DEMO === "1",
  rpcOverride: process.env.NEXT_PUBLIC_RPC_URL || null,
} as const;

// Mock data must never reach the production deployment (AGENTS.md Phase 4 rule).
if (env.deployEnv === "production" && env.adapter === "mock") {
  throw new Error("Refusing to run production with the mock adapter. Set NEXT_PUBLIC_ADAPTER=chain.");
}
if (env.deployEnv !== "development" && (env.forkDemo || env.rpcOverride)) {
  throw new Error("Fork demo settings (NEXT_PUBLIC_FORK_DEMO, NEXT_PUBLIC_RPC_URL) are for local runs only.");
}
