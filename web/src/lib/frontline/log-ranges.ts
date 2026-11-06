// Mezo testnet's RPC refuses eth_getLogs spans over 10,000 blocks, and the chain makes about
// 10,000 blocks a day, so every "since deploy" event query is split into windows.

/** Inclusive [from, to] windows covering `start..end`, each at most `span` blocks apart. */
export function blockRanges(start: bigint, end: bigint, span: bigint): [bigint, bigint][] {
  const out: [bigint, bigint][] = [];
  for (let from = start; from <= end; from += span + 1n) {
    out.push([from, from + span < end ? from + span : end]);
  }
  return out;
}
