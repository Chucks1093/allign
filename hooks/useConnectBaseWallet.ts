"use client";

import { useState } from "react";
import { useConnect, useConnectors } from "wagmi";

export function useConnectBaseWallet() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { connect } = useConnect();
  const connectors = useConnectors();

  async function connectWallet() {
    setIsConnecting(true);
    try {
      const connector = connectors.find((c) => c.id === "baseAccount") ?? connectors[0];
      if (!connector) throw new Error("No connector available");
      connect({ connector });
    } catch (e: any) {
      console.error("Connect failed:", e?.message);
    } finally {
      setIsConnecting(false);
    }
  }

  return { connect: connectWallet, isConnecting };
}
