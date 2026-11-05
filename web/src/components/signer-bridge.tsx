"use client";

import { useEffect } from "react";
import { useSendTransaction, useSwitchChain } from "wagmi";
import { useSendTransaction as usePassportSend } from "@mezo-org/orangekit";
import { useWalletAccount } from "@mezo-org/passport/dist/src/hooks/useWalletAccount";
import { setSigner } from "@/lib/frontline/signer";
import { mezoTestnet } from "@/lib/mezo";

/** Registers the connected wallet as the chain adapter's signer. Renders nothing. */
export function SignerBridge() {
  const { accountAddress, networkFamily, chainId, isConnected } = useWalletAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransaction: sendThroughPassport } = usePassportSend();

  useEffect(() => {
    if (!isConnected || !accountAddress) {
      setSigner(null);
      return;
    }
    const bitcoin = networkFamily === "bitcoin";
    setSigner({
      account: accountAddress,
      bitcoin,
      async send(req, gas) {
        if (bitcoin) {
          // Bitcoin wallets act through their Mezo smart account.
          const res = await sendThroughPassport(req.to, req.value, req.data);
          if (!res?.hash) throw new Error("The Bitcoin wallet did not return a transaction.");
          return res.hash;
        }
        if (chainId !== mezoTestnet.id) await switchChainAsync({ chainId: mezoTestnet.id });
        return sendTransactionAsync({ to: req.to, data: req.data, value: req.value, gas, chainId: mezoTestnet.id });
      },
    });
    return () => setSigner(null);
  }, [accountAddress, networkFamily, chainId, isConnected, sendTransactionAsync, switchChainAsync, sendThroughPassport]);

  return null;
}
