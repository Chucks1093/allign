"use client";

import { useState, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useWallets } from "@privy-io/react-auth";
import EmptyChat from "./EmptyChat";
import ChatMessages from "./ChatMessages";
import BuyModal from "@/components/trade/BuyModal";
import { STOCKS } from "@/lib/stocks/tokens";
import type { Stock } from "@/lib/stocks/tokens";

interface TradeModalState {
  stock: Stock;
  price: number;
  initialTab: "Buy" | "Sell";
}

export default function ChatArea() {
  const [input, setInput] = useState("");
  const [tradeModal, setTradeModal] = useState<TradeModalState | null>(null);

  const { wallets } = useWallets();
  const evmWallet = wallets.find((w) => w.walletClientType !== "solana");

  // Keep latest wallet address in a ref so the transport (created once) always sends the current value
  const walletRef = useRef<string | undefined>(undefined);
  walletRef.current = evmWallet?.address;

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ walletAddress: walletRef.current }),
    }),
    [] // created once; body fn reads ref at send time
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function handleOpenTrade(sym: string, side: "buy" | "sell", price: number) {
    const stock = STOCKS.find((s) => s.tokenTicker === sym);
    if (!stock) return;
    setTradeModal({ stock, price, initialTab: side === "buy" ? "Buy" : "Sell" });
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0d0d0d] overflow-hidden">
      {hasMessages ? (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onOpenTrade={handleOpenTrade}
        />
      ) : (
        <EmptyChat
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
        />
      )}

      {tradeModal && (
        <BuyModal
          stock={tradeModal.stock}
          price={tradeModal.price}
          initialTab={tradeModal.initialTab}
          onClose={() => setTradeModal(null)}
        />
      )}
    </div>
  );
}
