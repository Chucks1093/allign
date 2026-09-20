"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import AuthSync from "./AuthSync";

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;

  return (
    <Privy
      appId={appId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#0052ff",
          logo: "http://localhost:3000/logo-privy.svg",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: {
          id: 8453,
          name: "Base",
          network: "base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
          blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
        },
        supportedChains: [
          {
            id: 8453,
            name: "Base",
            network: "base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
            blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
          },
        ],
      }}
    >
      <AuthSync />
      {children}
    </Privy>
  );
}
