"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAccount } from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi";
import EmptyChat from "./EmptyChat";
import ChatMessages from "./ChatMessages";
import BuyModal from "@/components/trade/BuyModal";
import { STOCKS } from "@/lib/stocks/tokens";
import type { Stock } from "@/lib/stocks/tokens";
import { recordActivity } from "@/lib/agent/activity";

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
  const [pendingTrade, setPendingTrade] = useState<{
    callsId: string;
    userText: string;
    received: string;
    sym: string;
    side: "buy" | "sell";
  } | null>(null);

  const { address } = useAccount();
  const { sendCallsAsync } = useSendCalls();
  const { data: callsStatus } = useCallsStatus({
    id: pendingTrade?.callsId ?? "",
    query: { enabled: !!pendingTrade?.callsId, refetchInterval: 1500 },
  });

  // When tx confirms, send result to AI and record activity
  useEffect(() => {
    if (!callsStatus?.receipts?.length || !pendingTrade) return;
    const txHash = callsStatus.receipts[0].transactionHash;
    const link = `https://basescan.org/tx/${txHash}`;
    sendMessage({
      text: `__trade_result__ "${pendingTrade.userText}" succeeded. User received ${pendingTrade.received}. Basescan: ${link}. Tell the user in a short friendly message and include the link.`,
    });
    if (address) {
      const isBuy = pendingTrade.side === "buy";
      // buy:  received = "0.001287 NVDAc",  userText = "Buy $0.29 of NVIDIA"
      // sell: received = "$0.2900 USDC",     userText = "Sell 0.001287 NVDAc"
      const receivedNum = parseFloat(pendingTrade.received.replace(/[^0-9.]/g, "")) || 0;
      const shares = isBuy ? receivedNum : parseFloat(pendingTrade.userText.split(" ")[1]) || 0;
      const amount_usdc = isBuy ? parseFloat(pendingTrade.userText.replace(/[^0-9.]/g, "")) || 0 : receivedNum;
      recordActivity({
        wallet_address: address,
        type: pendingTrade.side,
        title: isBuy ? `Bought ${pendingTrade.sym}` : `Sold ${pendingTrade.sym}`,
        description: pendingTrade.userText,
        info: {
          ticker: pendingTrade.sym,
          shares,
          amount_usdc,
          price: shares > 0 ? amount_usdc / shares : 0,
          tx_hash: txHash,
          signal_score: 0,
        },
      }).catch(() => {});
    }
    setPendingTrade(null);
  }, [callsStatus]);
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

  // Load saved chat when wallet connects
  useEffect(() => {
    if (!address) return;
    fetch(`/api/chats?wallet=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [address]);

  // Auto-save when AI finishes responding
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasStreaming = prevStatus.current === "streaming" || prevStatus.current === "submitted";
    const doneNow = status === "ready";
    if (wasStreaming && doneNow && address && messages.length > 0) {
      fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address.toLowerCase(), messages }),
      }).catch(() => {});
    }
    prevStatus.current = status;
  }, [status, messages, address]);

  function patchToolOutput(toolCallId: string, patch: Record<string, any>) {
    setMessages((prev: any) =>
      prev.map((msg: any) => ({
        ...msg,
        parts: msg.parts?.map((p: any) =>
          p.toolCallId === toolCallId ? { ...p, output: { ...p.output, ...patch } } : p
        ),
      }))
    );
  }

  function patchMessage(messageId: string, patch: Record<string, any>) {
    setMessages((prev: any) =>
      prev.map((msg: any) => (msg.id === messageId ? { ...msg, ...patch } : msg))
    );
  }

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

  async function handleExecuteTrade(sym: string, side: "buy" | "sell", amount: string, name: string, toolCallId: string) {
    patchToolOutput(toolCallId, { _traded: true });
    if (!address) return;

    // 1. Inject user message into chat
    const userText = side === "buy"
      ? `Buy $${amount} of ${name}`
      : `Sell ${amount} ${sym}`;

    setMessages((prev: any) => [
      ...prev,
      { id: `trade-${Date.now()}`, role: "user", parts: [{ type: "text", text: userText }] },
    ]);

    // 2. Fetch fresh quote to get transaction steps
    let quote: any;
    try {
      const res = await fetch("/api/stocks/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sym, side, amount, taker: address, slippageBps: 100 }),
      });
      quote = await res.json();
      if (!res.ok || !quote.steps?.length) throw new Error(quote.error ?? "Quote failed");
    } catch (e: any) {
      sendMessage({ text: `__trade_failed__ ${userText} failed: ${e.message}. Tell the user briefly.` });
      return;
    }

    // 3. Send transaction — wallet popup appears
    try {
      const result = await sendCallsAsync({
        calls: quote.steps.map((step: any) => ({
          to: step.to,
          data: step.data,
          value: BigInt(step.value),
        })),
      });

      const received = side === "buy"
        ? `${(Number(quote.advisory.amountOut) / 1e8).toFixed(6)} ${sym}`
        : `$${(Number(quote.advisory.amountOut) / 1e6).toFixed(4)} USDC`;

      // Store pending trade — useEffect will fire when tx confirms and send to AI
      setPendingTrade({ callsId: result.id, userText, received, sym, side });
    } catch (e: any) {
      const reason = e?.shortMessage ?? e?.message ?? "Transaction rejected";
      sendMessage({ text: `__trade_failed__ ${userText} failed: ${reason}. Tell the user briefly.` });
      if (address) {
        recordActivity({
          wallet_address: address,
          type: "error",
          title: `${side === "buy" ? "Buy" : "Sell"} failed`,
          description: userText,
          info: { reason, ticker: sym },
        }).catch(() => {});
      }
    }
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

  async function handleConfirmAgent(budgetUSD: number, periodDays: number, messageId: string) {
    if (!address) return;
    setIsAgentActing(true);
    patchMessage(messageId, { _agentConfirmed: true });

    // Inject user message into chat
    setMessages((prev: any) => [
      ...prev,
      {
        id: `agent-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: `Activate Allign AI Agent — $${budgetUSD} USDC/day for ${periodDays} days` }],
      },
    ]);

    try {
      const spenderRes = await fetch("/api/agent/spender");
      const spenderData = await spenderRes.json();
      if (!spenderRes.ok) throw new Error(spenderData.error ?? "Could not get spender address");
      const spender = spenderData.address;

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

      await fetch("/api/agent/permission/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, permission, budgetUsdc: budgetUSD, periodDays }),
      });

      sendMessage({
        text: `__agent_activated__ Budget: $${budgetUSD} USDC/day for ${periodDays} days. Tell the user their Allign AI Agent is now live in a short friendly message. Mention it runs every 4 hours and they can check the Agent page for activity.`,
      });
    } catch (e: any) {
      console.error("Agent activation failed:", e);
      sendMessage({
        text: `__agent_failed__ ${e?.message ?? "Wallet signature rejected"}. Tell the user activation failed briefly and suggest they try again.`,
      });
    } finally {
      setIsAgentActing(false);
    }
  }

  function handleRejectAgent() {
    injectAssistantMessage("👍 No problem — let me know when you want to activate the agent.");
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-transparent overflow-hidden">
      {hasMessages ? (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onExecuteTrade={handleExecuteTrade}
          onClearChat={() => {
            setMessages([]);
            if (address) {
              fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wallet: address.toLowerCase(), messages: [] }),
              }).catch(() => {});
            }
          }}
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
