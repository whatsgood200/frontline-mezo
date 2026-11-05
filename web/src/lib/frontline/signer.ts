import type { Address, Hex } from "viem";
import type { TxRequest } from "./chain-calls";

/**
 * The connected wallet, registered by <SignerBridge/> (React) so the framework-free chain
 * adapter can send transactions. Bitcoin wallets sign through their Mezo smart account
 * (Mezo Passport / OrangeKit); EVM wallets sign directly.
 */
export interface Signer {
  account: Address;
  bitcoin: boolean;
  send(req: TxRequest, gas: bigint | undefined): Promise<Hex>;
}

let current: Signer | null = null;

export function setSigner(signer: Signer | null): void {
  current = signer;
}

export function getSigner(): Signer | null {
  return current;
}
