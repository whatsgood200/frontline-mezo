import { createPublicClient, http } from "viem";
import { env } from "@/lib/env";
import { chains } from "@/lib/mezo";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5_000;

export async function GET() {
  const chain = chains[env.network];
  const client = createPublicClient({ chain, transport: http(undefined, { timeout: TIMEOUT_MS }) });
  const started = Date.now();
  try {
    const block = await client.getBlockNumber();
    return Response.json({
      data: {
        status: "ok",
        network: env.network,
        chainId: chain.id,
        block: block.toString(),
        rpcLatencyMs: Date.now() - started,
        adapter: env.adapter,
        commit: env.commit,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("health: RPC check failed", { network: env.network, message });
    return Response.json(
      { data: null, error: { code: "RPC_UNAVAILABLE", message: `Mezo ${env.network} RPC did not answer` } },
      { status: 503 },
    );
  }
}
