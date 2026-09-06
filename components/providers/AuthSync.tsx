"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";

export default function AuthSync() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address) return;

    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: address }),
    }).catch(() => {});
  }, [isConnected, address]);

  return null;
}
