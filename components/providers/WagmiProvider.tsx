"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider as Wagmi } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import PrivyProvider from "./PrivyProvider";

const queryClient = new QueryClient();

export default function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Wagmi config={wagmiConfig}>
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </Wagmi>
    </QueryClientProvider>
  );
}
