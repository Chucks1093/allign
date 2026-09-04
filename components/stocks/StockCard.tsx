"use client";

import { type StockPrice } from "@/lib/stocks/prices";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockCardProps {
  data: StockPrice;
  onBuy?: (ticker: string) => void;
}

export default function StockCard({ data, onBuy }: StockCardProps) {
  const { stock, price, error, changePercent } = data;
  const hasChange = changePercent !== undefined;
  const isUp = (changePercent ?? 0) >= 0;

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col gap-3 hover:bg-[#222] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg">
            {stock.logo}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{stock.name}</p>
            <p className="text-white/40 text-xs">{stock.tokenTicker}</p>
          </div>
        </div>

        {hasChange ? (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            isUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? "+" : ""}{changePercent}%
          </div>
        ) : (
          <div className="text-xs text-white/20 px-2 py-0.5">—</div>
        )}
      </div>

      {/* Price */}
      <div>
        {error ? (
          <p className="text-white/30 text-sm">Price unavailable</p>
        ) : (
          <p className="text-white font-semibold text-xl">
            ${price > 0 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
          </p>
        )}
        <p className="text-white/30 text-xs mt-0.5">per token · Base</p>
      </div>

      {/* Buy button */}
      <button
        onClick={() => onBuy?.(stock.tokenTicker)}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl transition-colors cursor-pointer"
      >
        Buy {stock.tokenTicker}
      </button>
    </div>
  );
}
