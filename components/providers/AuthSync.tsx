"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets, useCreateWallet, getEmbeddedConnectedWallet } from "@privy-io/react-auth";
import { useConnect, useDisconnect, useConnectors } from "wagmi";
import { setPrivyWalletProvider, clearPrivyWalletProvider } from "@/lib/wagmi";

export default function AuthSync() {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const syncedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !walletsReady) return;

    if (!authenticated) {
      if (syncedAddress.current) {
        syncedAddress.current = null;
        clearPrivyWalletProvider();
        disconnect();
      }
      return;
    }

    // Prefer embedded wallet; fall back to any connected external wallet
    const embedded = getEmbeddedConnectedWallet(wallets);
    const wallet = embedded ?? wallets[0];

    if (!wallet) {
      // No wallet at all — create an embedded one (only for social/email logins)
      createWallet().catch(() => {});
      return;
    }

    if (syncedAddress.current === wallet.address) return;

    wallet.getEthereumProvider().then((provider) => {
      syncedAddress.current = wallet.address;
      setPrivyWalletProvider(provider, wallet.address);

      const privyConnector = connectors.find((c) => c.id === "privyEmbedded");
      if (privyConnector) connect({ connector: privyConnector });

      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.address }),
      }).catch(() => {});
    });
  }, [ready, walletsReady, authenticated, wallets, createWallet, connect, disconnect, connectors]);

  return null;
}
