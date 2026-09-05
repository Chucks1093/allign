"use client";

import { useState } from "react";
import { useStockPrices } from "@/hooks/useStockPrices";
import StockCard from "@/components/stocks/StockCard";
import BuyModal from "@/components/trade/BuyModal";
import { RefreshCw } from "lucide-react";
import type { StockPrice } from "@/lib/stocks/prices";

export default function ExplorePage() {
  const { stocks, loading, refreshing, error, refresh } = useStockPrices();
  const [selected, setSelected] = useState<StockPrice | null>(null);

  return (
    <div className="bg-[#0d0d0d] px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Explore Stocks</h1>
          <p className="text-white/40 text-sm mt-1">Tokenized US equities available on Base</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm bg-[#1a1a1a] hover:bg-[#222] px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-2xl p-4 h-40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-white/50 text-sm">Could not load prices from Base.</p>
          <button onClick={refresh} className="mt-4 text-blue-400 hover:text-blue-300 text-sm cursor-pointer">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stocks.map((data) => (
            <StockCard
              key={data.stock.tokenTicker}
              data={data}
              onBuy={() => setSelected(data)}
            />
          ))}
        </div>
      )}

      {selected && (
        <BuyModal
          stock={selected.stock}
          price={selected.price}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
