"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export default function AuthSync() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    if (!authenticated || !user || wallets.length === 0) return;

    const evmWallet = wallets.find((w) => w.walletClientType !== "solana");
    if (!evmWallet) return;

    fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        privy_user_id: user.id,
        wallet_address: evmWallet.address,
      }),
    });
  }, [authenticated, user, wallets]);

  return null;
}
