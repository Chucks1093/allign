"use client";

import { useState } from "react";
import { useConnect } from "wagmi";
import { useConnectors } from "wagmi";

export function useConnectBaseWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { connect } = useConnect();
  const connectors = useConnectors();

  async function connectWallet() {
    setIsConnecting(true);
    try {
      const { createBaseAccountSDK } = await import("@base-org/account");
      const sdk = createBaseAccountSDK({ appName: "Allign" });
      const provider = sdk.getProvider();

      const result = (await provider.request({
        method: "wallet_connect",
        params: [{ version: "1" }],
      })) as { accounts?: Array<{ address: string }> };

      const address = result?.accounts?.[0]?.address;
      if (!address) throw new Error("No address returned");

      // Sync to wagmi state using baseAccount connector
      const connector = connectors.find((c) => c.id === "baseAccount") ?? connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (e: any) {
      console.error("Connect failed:", e?.message);
    } finally {
      setIsConnecting(false);
    }
  }

  return { connect: connectWallet, isConnecting };
}
