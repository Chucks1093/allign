"use client";

import { useEffect, useRef } from "react";
import { UIMessage } from "@ai-sdk/react";
import { Plus, Brain, Mic, ArrowUp, TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PortfolioHolding {
  ticker: string;
  name: string;
  logo: string;
  tokenTicker: string;
  shares: number;
  price: number;
  value: number;
  changePercent?: number;
}

interface PortfolioOutput {
  holdings: PortfolioHolding[];
  totalValue: number;
  error?: string;
}

function PortfolioCard({ part, onOpenTrade }: { part: any; onOpenTrade: ChatMessagesProps["onOpenTrade"] }) {
  if (part.state === "input") {
    return (
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40">
        <Loader2 size={13} className="animate-spin" />
        Loading portfolio…
      </div>
    );
  }

  if (part.state === "error" || part.output?.error) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400">
        <AlertCircle size={13} />
        {part.output?.error ?? "Failed to load portfolio"}
      </div>
    );
  }

  const p: PortfolioOutput = part.output;
  if (!p || p.holdings.length === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40">
        No tokenized stocks in your wallet yet.
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-3 w-full max-w-xs">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Your Portfolio</p>
        <p className="text-white/40 text-xs">${p.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="space-y-3">
        {p.holdings.map((h) => (
          <div key={h.ticker}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{h.logo}</span>
                <div>
                  <p className="text-white text-xs font-medium">{h.name}</p>
                  <p className="text-white/30 text-xs">{h.shares.toFixed(6)} {h.tokenTicker}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-xs font-medium">${h.value.toFixed(2)}</p>
                {h.changePercent !== undefined && (
                  <p className={`text-xs ${h.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {h.changePercent >= 0 ? "+" : ""}{h.changePercent.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onOpenTrade(h.tokenTicker, "buy", h.price)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#a8ff78]/20 hover:bg-[#a8ff78]/30 text-[#a8ff78] transition-all cursor-pointer"
              >
                Buy
              </button>
              <button
                onClick={() => onOpenTrade(h.tokenTicker, "sell", h.price)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-all cursor-pointer"
              >
                Sell
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface QuoteOutput {
  sym: string;
  side: "buy" | "sell";
  amount: string;
  pricePerShare: number;
  feedUsd: number;
  vsFeedPct: number;
  amountOut: string;
  amountOutMin: string;
  receiveUnit: string;
  poolLiquidityUsdc: number;
  error?: string;
}

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onOpenTrade: (sym: string, side: "buy" | "sell", price: number, initialAmount?: string) => void;
}

function PriceCard({ part }: { part: any }) {
  if (part.state === "input") {
    return (
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40">
        <Loader2 size={13} className="animate-spin" />
        Checking price…
      </div>
    );
  }

  if (part.state === "error" || part.output?.error) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400">
        <AlertCircle size={13} />
        {part.output?.error ?? "Price unavailable"}
      </div>
    );
  }

  const p = part.output;
  if (!p) return null;

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-4 w-fit">
      <span className="text-2xl">{p.logo}</span>
      <div>
        <p className="text-white font-semibold text-sm">{p.name} <span className="text-white/30 font-normal">({p.sym})</span></p>
        <p className="text-white/70 text-lg font-bold">${p.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
      </div>
      {p.changePercent !== undefined && (
        <span className={`text-sm font-semibold ${p.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {p.changePercent >= 0 ? "+" : ""}{p.changePercent.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function QuoteCard({ part, onOpenTrade }: { part: any; onOpenTrade: ChatMessagesProps["onOpenTrade"] }) {
  if (part.state === "input") {
    return (
      <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40">
        <Loader2 size={13} className="animate-spin" />
        Fetching live quote…
      </div>
    );
  }

  if (part.state === "error" || part.output?.error) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400">
        <AlertCircle size={13} />
        {part.output?.error ?? "Quote failed"}
      </div>
    );
  }

  const q: QuoteOutput = part.output;
  if (!q) return null;

  const isBuy = q.side === "buy";
  const deviation = Math.abs(q.vsFeedPct) > 2;

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 space-y-3 w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{q.sym}</p>
          <p className="text-white/40 text-xs">{isBuy ? "Buy order" : "Sell order"} · ${parseFloat(q.amount).toLocaleString()} {isBuy ? "USDC" : q.sym}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {isBuy ? "BUY" : "SELL"}
        </span>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#111] rounded-xl px-3 py-2">
          <p className="text-white/30 mb-0.5">Price/share</p>
          <p className="text-white font-medium">${q.pricePerShare.toFixed(4)}</p>
        </div>
        <div className="bg-[#111] rounded-xl px-3 py-2">
          <p className="text-white/30 mb-0.5">You receive</p>
          <p className="text-white font-medium">{q.amountOut} {q.receiveUnit}</p>
        </div>
      </div>

      {/* Deviation warning */}
      {deviation && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-400">
          <AlertCircle size={11} />
          Price deviates {q.vsFeedPct.toFixed(2)}% from Chainlink feed
        </div>
      )}

      {/* vs feed */}
      <div className="flex items-center justify-between text-xs text-white/30">
        <span className="flex items-center gap-1">
          {q.vsFeedPct >= 0 ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
          vs Chainlink
        </span>
        <span className={q.vsFeedPct >= 0 ? "text-emerald-400" : "text-red-400"}>
          {q.vsFeedPct >= 0 ? "+" : ""}{q.vsFeedPct.toFixed(3)}%
        </span>
      </div>

      {/* Trade button */}
      <button
        onClick={() => onOpenTrade(q.sym, q.side, q.pricePerShare, q.amount)}
        disabled={deviation}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
          deviation
            ? "bg-white/5 text-white/20 cursor-not-allowed"
            : isBuy
            ? "bg-[#a8ff78] hover:bg-[#96f060] text-black"
            : "bg-red-500 hover:bg-red-400 text-white"
        }`}
      >
        {isBuy ? `Buy ${q.sym}` : `Sell ${q.sym}`} →
      </button>
    </div>
  );
}

export default function ChatMessages({
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  onOpenTrade,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="px-8 py-8 space-y-6 max-w-3xl mx-auto">
          {messages.map((msg) => {
            if (msg.role === "user") {
              const text = msg.parts
                .filter((p) => p.type === "text")
                .map((p: any) => p.text)
                .join("");
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[70%] bg-[#2f2f2f] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
                    {text}
                  </div>
                </div>
              );
            }

            // Assistant message — render each part
            return (
              <div key={msg.id} className="flex flex-col gap-3 items-start">
                {msg.parts.map((part: any, i: number) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <p key={i} className="max-w-[80%] text-white text-sm leading-relaxed whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "tool-getQuote") {
                    return <QuoteCard key={i} part={part} onOpenTrade={onOpenTrade} />;
                  }
                  if (part.type === "tool-getPortfolio") {
                    return <PortfolioCard key={i} part={part} onOpenTrade={onOpenTrade} />;
                  }
                  if (part.type === "tool-getPrice") {
                    return <PriceCard key={i} part={part} />;
                  }
                  return null;
                })}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1 pt-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Persistent input bar */}
      <div className="px-4 pb-6 pt-2 flex justify-center">
        <div className="w-full max-w-2xl bg-[#1a1a1a] rounded-2xl px-4 py-3 flex items-center gap-3">
          <button type="button" className="text-white/50 hover:text-white transition-colors shrink-0">
            <Plus size={20} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Ask anything"
            className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-medium transition-colors px-1">
              <Brain size={15} />
              <span>Think</span>
            </button>
            <button type="button" className="text-white/50 hover:text-white transition-colors">
              <Mic size={18} />
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ArrowUp size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
