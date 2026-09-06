"use client";

import { useState, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount } from "wagmi";
import EmptyChat from "./EmptyChat";
import ChatMessages from "./ChatMessages";
import BuyModal from "@/components/trade/BuyModal";
import { STOCKS } from "@/lib/stocks/tokens";
import type { Stock } from "@/lib/stocks/tokens";

interface TradeModalState {
  stock: Stock;
  price: number;
  initialTab: "Buy" | "Sell";
  initialAmount?: string;
}

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export default function ChatArea() {
  const [input, setInput] = useState("");
  const [tradeModal, setTradeModal] = useState<TradeModalState | null>(null);
  const [isAgentActing, setIsAgentActing] = useState(false);

  const { address } = useAccount();

  const walletRef = useRef<string | undefined>(undefined);
  walletRef.current = address;

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ walletAddress: walletRef.current }),
    }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function handleOpenTrade(sym: string, side: "buy" | "sell", price: number, initialAmount?: string) {
    const stock = STOCKS.find((s) => s.tokenTicker === sym);
    if (!stock) return;
    setTradeModal({ stock, price, initialTab: side === "buy" ? "Buy" : "Sell", initialAmount });
  }

  function injectAssistantMessage(text: string) {
    setMessages((prev: any) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "assistant") {
          const existing = updated[i].parts?.find((p: any) => p.type === "text")?.text ?? "";
          updated[i] = {
            ...updated[i],
            parts: [{ type: "text", text: existing ? `${existing}\n\n${text}` : text }],
          };
          return updated;
        }
      }
      return [...prev, { id: `sys-${Date.now()}`, role: "assistant", parts: [{ type: "text", text }] }];
    });
  }

  async function handleConfirmAgent(budgetUSD: number, periodDays: number) {
    if (!address) return;
    setIsAgentActing(true);
    try {
      // 1. Get spender address (our server wallet)
      const spenderRes = await fetch("/api/agent/spender");
      const spenderData = await spenderRes.json();
      if (!spenderRes.ok) throw new Error(spenderData.error ?? "Could not get spender address");
      const spender = spenderData.address;

      // 2. Request spend permission via Base Account SDK (client-side wallet popup)
      const { createBaseAccountSDK } = await import("@base-org/account");
      const { requestSpendPermission } = await import("@base-org/account/spend-permission");
      const sdk = createBaseAccountSDK({ appName: "Allign" });

      const allowance = BigInt(Math.round(budgetUSD * 1_000_000));
      const permission = await requestSpendPermission({
        account: address,
        spender,
        token: USDC_ADDRESS,
        chainId: 8453,
        allowance,
        periodInDays: periodDays,
        provider: sdk.getProvider(),
      } as never);

      // 3. Store permission server-side
      await fetch("/api/agent/permission/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          permission,
          budgetUsdc: budgetUSD,
          periodDays,
        }),
      });

      injectAssistantMessage(
        `✅ Agent activated! I'll trade up to $${budgetUSD} USDC per day for the next ${periodDays} days. I run every 4 hours — check the Agent page to see my activity.`
      );
    } catch (e: any) {
      console.error("Agent activation failed:", e);
      injectAssistantMessage(
        `❌ Activation failed: ${e?.message ?? "Wallet signature rejected"}. Try again when ready.`
      );
    } finally {
      setIsAgentActing(false);
    }
  }

  function handleRejectAgent() {
    injectAssistantMessage("👍 No problem — let me know when you want to activate the agent.");
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
          onConfirmAgent={handleConfirmAgent}
          onRejectAgent={handleRejectAgent}
          isAgentActing={isAgentActing}
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
          initialAmount={tradeModal.initialAmount}
          onClose={() => setTradeModal(null)}
        />
      )}
    </div>
  );
}
