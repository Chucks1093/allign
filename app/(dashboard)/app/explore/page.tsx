"use client";

import { useStockPrices } from "@/hooks/useStockPrices";
import StockCard from "@/components/stocks/StockCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, TrendingUp, TrendingDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { STRATEGIES } from "@/lib/stocks/strategies";
import { STOCKS } from "@/lib/stocks/tokens";
import { useStrategyReturns } from "@/hooks/useStrategyReturns";
import { useTokenStats } from "@/hooks/useTokenStats";

export default function ExplorePage() {
  const { stocks, loading, refreshing, error, refresh } = useStockPrices();
  const { returns: strategyReturns, loading: returnsLoading } = useStrategyReturns();
  const { stats, loading: statsLoading } = useTokenStats();
  const [search, setSearch] = useState("");

  // Trending = sorted by absolute change, duplicated for seamless loop
  const tickerItems = useMemo(() => {
    if (!stocks.length) return [];
    const sorted = [...stocks]
      .filter((s) => s.changePercent !== undefined)
      .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));
    return [...sorted, ...sorted];
  }, [stocks]);

  return (
    <ScrollArea className="h-full">
      {/* Marquee ticker strip */}
      {tickerItems.length > 0 && (
        <div
          className="w-full overflow-hidden py-2.5"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
        >
          <div className="flex gap-2 animate-ticker w-max">
            {tickerItems.map((s, i) => {
              const up = (s.changePercent ?? 0) >= 0;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 bg-white/5 rounded-xl px-4 py-2 shrink-0"
                >
                  <img
                    src={s.stock.logo}
                    alt={s.stock.name}
                    width={28}
                    height={28}
                    className="rounded-full bg-white p-0.5"
                  />
                  <span className="text-white text-sm font-semibold">{s.stock.tokenTicker}</span>
                  <span className="text-white/50 text-sm">
                    ${s.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {up ? "+" : ""}{(s.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strategy Baskets */}
      <div className="px-8 pt-6 pb-2">
        <h2 className="text-white font-semibold text-lg mb-4">Strategy Baskets</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STRATEGIES.map((s) => {
            const realReturn = strategyReturns[s.id];
            const returnPct = realReturn ?? s.returnPct;
            const up = returnPct >= 0;
            return (
              <div
                key={s.id}
                className="relative rounded-2xl p-4 overflow-hidden cursor-pointer group bg-[#1a1a1a] hover:bg-[#222] transition-colors h-[160px] flex flex-col justify-between"
              >
                {/* Stock logos — large, greyed, bleeding off right edge */}
                <div className="absolute -right-10 top-0 bottom-0 flex items-center">
                  {s.holdings.slice(0, 3).map((h, i) => {
                    const stock = STOCKS.find((st) => st.tokenTicker === h.ticker);
                    if (!stock) return null;
                    return (
                      <img
                        key={h.ticker}
                        src={stock.logo}
                        alt={stock.name}
                        width={68}
                        height={68}
                        className="rounded-full bg-white p-0.5 grayscale border-2 border-[#1a1a1a] pointer-events-none select-none"
                        style={{ marginLeft: i === 0 ? 0 : -22 }}
                      />
                    );
                  })}
                </div>

                {/* Name */}
                <p className="text-white font-black text-[13px] uppercase leading-tight tracking-wide pr-20 font-montserrat">
                  {s.name}
                </p>

                {/* Stock logos */}
                <div className="flex items-center">
                  {s.holdings.slice(0, 5).map((h, i) => {
                    const stock = STOCKS.find((st) => st.tokenTicker === h.ticker);
                    if (!stock) return null;
                    return (
                      <img
                        key={h.ticker}
                        src={stock.logo}
                        alt={stock.name}
                        width={24}
                        height={24}
                        className="rounded-full bg-white p-0.5 border-2 border-[#1a1a1a]"
                        style={{ marginLeft: i === 0 ? 0 : -8, zIndex: i }}
                      />
                    );
                  })}
                  {s.holdings.length > 5 && (
                    <div
                      className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#1a1a1a] flex items-center justify-center text-[9px] text-white/60 font-semibold"
                      style={{ marginLeft: -8 }}
                    >
                      +{s.holdings.length - 5}
                    </div>
                  )}
                </div>

                {/* Return + arrow */}
                <div className="flex items-end justify-between">
                  <div>
                    {returnsLoading && realReturn === undefined ? (
                      <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                    ) : (
                      <p className={`text-base font-bold leading-none ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? "+" : ""}{returnPct.toFixed(2)}%
                      </p>
                    )}
                    <p className="text-white/40 text-[10px] mt-1">1-year return</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                    <ChevronRight size={18} className="text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Stocks */}
      {!loading && !error && (
        <div className="px-8 pt-6 pb-2">
          <h2 className="text-white font-semibold text-lg mb-4">Featured Stocks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...stocks]
              .filter((s) => s.changePercent !== undefined)
              .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
              .slice(0, 3)
              .map((data) => (
                <StockCard key={data.stock.tokenTicker} data={data} />
              ))}
          </div>
        </div>
      )}

      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-white text-2xl font-semibold shrink-0">All Stocks</h1>
            <button
              onClick={refresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-72">
            <Search size={14} className="text-white/30 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol…"
              className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none w-full"
            />
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-white/50 text-sm">Could not load prices from Base.</p>
            <button onClick={refresh} className="mt-4 text-blue-400 hover:text-blue-300 text-sm cursor-pointer">Try again</button>
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#111]">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
              <span className="text-white/30 text-xs font-medium">Token</span>
              <span className="text-white/30 text-xs font-medium text-right">Price</span>
              <span className="text-white/30 text-xs font-medium text-right">24H</span>
              <span className="text-white/30 text-xs font-medium text-right">Market Cap</span>
              <span className="text-white/30 text-xs font-medium text-right">Volume</span>
              <span className="text-white/30 text-xs font-medium text-right">Age</span>
            </div>

            {/* Table rows */}
            {stocks
              .filter((data) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return (
                  data.stock.name.toLowerCase().includes(q) ||
                  data.stock.ticker.toLowerCase().includes(q) ||
                  data.stock.tokenTicker.toLowerCase().includes(q)
                );
              })
              .map((data, idx, arr) => {
                const isUp = (data.changePercent ?? 0) >= 0;

                // Compute relative age from launchedAt
                let age = "—";
                if (data.stock.launchedAt) {
                  const seconds = Math.floor(Date.now() / 1000) - data.stock.launchedAt;
                  const days = Math.floor(seconds / 86400);
                  if (days < 1) age = `${Math.floor(seconds / 3600)}h`;
                  else if (days < 30) age = `${days}d`;
                  else if (days < 365) age = `${Math.floor(days / 30)}mo`;
                  else age = `${Math.floor(days / 365)}y`;
                }

                const tokenStat = stats[data.stock.tokenTicker];
                const formatUsd = (val: number | null | undefined, fallback = "—") => {
                  if (val == null) return fallback;
                  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
                  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
                  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
                  return `$${val.toFixed(2)}`;
                };
                const volDisplay = statsLoading ? null : formatUsd(tokenStat?.volume24h);
                const mcapDisplay = statsLoading ? null : formatUsd(tokenStat?.marketCap);

                return (
                  <div
                    key={data.stock.tokenTicker}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                  >
                    {/* Token */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={data.stock.logo}
                          alt={data.stock.name}
                          width={38}
                          height={38}
                          className="rounded-full bg-white p-0.5"
                        />
                        <img
                          src="/icons/base.svg"
                          alt="Base"
                          width={13}
                          height={13}
                          className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-[#111]"
                        />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm leading-tight">{data.stock.ticker}</p>
                        <p className="text-white/40 text-xs mt-0.5">{data.stock.name}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <p className="text-white font-medium text-sm text-right">
                      {data.error ? "—" : `$${data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>

                    {/* 24H */}
                    <p className={`text-sm font-medium text-right ${data.changePercent === undefined ? "text-white/30" : isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {data.changePercent === undefined ? "—" : `${isUp ? "+" : ""}${data.changePercent}%`}
                    </p>

                    {/* Market Cap */}
                    {mcapDisplay === null ? (
                      <div className="h-4 w-14 bg-white/10 rounded animate-pulse ml-auto" />
                    ) : (
                      <p className="text-white/60 text-sm text-right">{mcapDisplay}</p>
                    )}

                    {/* Volume */}
                    {volDisplay === null ? (
                      <div className="h-4 w-14 bg-white/10 rounded animate-pulse ml-auto" />
                    ) : (
                      <p className="text-white/60 text-sm text-right">{volDisplay}</p>
                    )}

                    {/* Age */}
                    <p className="text-white/50 text-sm text-right">{age}</p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
