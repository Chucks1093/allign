"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
   RefreshCw,
   Search,
   LayoutList,
   LayoutGrid,
   ChevronDown,
} from "lucide-react";
import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   Tooltip,
   CartesianGrid,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STOCKS } from "@/lib/stocks/tokens";

interface Holding {
   ticker: string;
   name: string;
   logo: string;
   tokenTicker: string;
   shares: number;
   price: number;
   value: number;
   changePercent?: number;
}

interface PortfolioData {
   holdings: Holding[];
   totalValue: number;
}

interface Point {
   t: number;
   value: number;
}

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

function fmt(n: number) {
   return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
   });
}

function formatDate(t: number, range: Range) {
   const d = new Date(t * 1000);
   if (range === "1D")
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
   if (range === "1Y")
      return d.toLocaleDateString([], { month: "short", year: "2-digit" });
   return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function fetchCombinedChart(
   holdings: Holding[],
   range: Range,
): Promise<Point[]> {
   const results = await Promise.all(
      holdings.map((h) =>
         fetch(`/api/history?tokenTicker=${h.tokenTicker}&range=${range}`)
            .then((r) => r.json())
            .then((d) => ({
               shares: h.shares,
               points: (d.points ?? []) as { t: number; price: number }[],
            }))
            .catch(() => ({ shares: h.shares, points: [] })),
      ),
   );

   // Build union of all timestamps, sorted
   const allTs = [
      ...new Set(results.flatMap((r) => r.points.map((p) => p.t))),
   ].sort((a, b) => a - b);

   return allTs.map((t) => {
      let total = 0;
      for (const { shares, points } of results) {
         // Use most recent price at or before this timestamp
         const prev = points.filter((p) => p.t <= t);
         if (prev.length > 0) total += prev[prev.length - 1].price * shares;
      }
      return { t, value: total };
   });
}

export default function PortfolioView() {
   const { address } = useAccount();
   const [data, setData] = useState<PortfolioData | null>(null);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [chartRange, setChartRange] = useState<Range>("1M");
   const [chartPoints, setChartPoints] = useState<Point[]>([]);
   const [chartLoading, setChartLoading] = useState(false);
   const [search, setSearch] = useState("");
   const [sortBy, setSortBy] = useState<"weight" | "price" | "change">(
      "weight",
   );
   const [viewMode, setViewMode] = useState<"list" | "grid">("list");

   const fetchPortfolio = useCallback(
      async (isRefresh = false) => {
         if (!address) {
            setLoading(false);
            return;
         }
         if (isRefresh) setRefreshing(true);
         setError(null);
         try {
            const res = await fetch(`/api/portfolio?address=${address}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
         } catch (e: any) {
            setError(e?.message ?? "Failed to load portfolio");
         } finally {
            setLoading(false);
            setRefreshing(false);
         }
      },
      [address],
   );

   useEffect(() => {
      fetchPortfolio();
   }, [fetchPortfolio]);

   useEffect(() => {
      if (!data?.holdings?.length) return;
      setChartLoading(true);
      fetchCombinedChart(data.holdings, chartRange)
         .then(setChartPoints)
         .finally(() => setChartLoading(false));
   }, [data, chartRange]);

   if (!address) {
      return (
         <div className="h-full bg-[#0d0d0d] flex items-center justify-center">
            <p className="text-white/40 text-sm">
               Connect your wallet to view your portfolio
            </p>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="h-full bg-[#0d0d0d] px-8 py-8 space-y-4">
            <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
         </div>
      );
   }

   if (error) {
      return (
         <div className="h-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-3">
            <p className="text-red-400/70 text-sm">{error}</p>
            <button
               onClick={() => fetchPortfolio()}
               className="text-sm text-white/50 hover:text-white transition-colors cursor-pointer"
            >
               Try again
            </button>
         </div>
      );
   }

   if (!data || data.holdings.length === 0) {
      return (
         <div className="h-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-3">
            <p className="text-white/40 text-sm">
               No tokenized stocks in your wallet yet
            </p>
            <a
               href="/app/explore"
               className="text-sm text-white/60 hover:text-white transition-colors"
            >
               Browse stocks →
            </a>
         </div>
      );
   }

   const totalChange = data.holdings.reduce((sum, h) => {
      if (h.changePercent === undefined) return sum;
      return sum + (h.value * h.changePercent) / 100;
   }, 0);
   const totalChangePercent =
      data.totalValue > 0 ? (totalChange / data.totalValue) * 100 : 0;
   const isUp = totalChangePercent >= 0;
   const color = isUp ? "#22c55e" : "#ef4444";
   const chartConfig: ChartConfig = { value: { label: "Value", color } };

   const vals = chartPoints.map((p) => p.value);
   const minV = vals.length ? Math.min(...vals) : 0;
   const maxV = vals.length ? Math.max(...vals) : 0;
   const vRange = maxV - minV;
   const pad = vRange > 0 ? vRange * 0.005 : minV * 0.001;

   return (
      <ScrollArea className="h-full bg-[#0d0d0d]">
         <div className="px-8 py-8 flex flex-col gap-6">
            {/* Identity row — outside the card */}
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-xl bg-[#242424] flex items-center justify-center text-xl">
                  📊
               </div>
               <div className="flex items-baseline gap-2">
                  <h1 className="text-white text-3xl font-bold leading-tight font-manrope">
                     My Portfolio
                  </h1>
                  <span className="text-white/40 text-xl font-medium font-manrope">
                     {data.holdings.length} stocks
                  </span>
               </div>
            </div>

            {/* Chart card — price + range + change + chart only */}
            <div className="bg-[#181818] rounded-2xl p-5">
               {/* Price row */}
               <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-2xl font-bold tracking-tight">
                     {fmt(data.totalValue)}
                  </p>

                  {/* Range pill */}
                  <div className="flex items-center gap-0.5 bg-[#242424] rounded-full px-1.5 py-1.5">
                     {RANGES.map((r) => (
                        <button
                           key={r}
                           onClick={() => setChartRange(r)}
                           className={`px-3.5 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${
                              chartRange === r
                                 ? "bg-[#3a3a3a] text-white shadow"
                                 : "text-white/40 hover:text-white/70"
                           }`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Change */}
               <p
                  className={`flex items-center gap-1.5 text-sm font-medium mb-5 ${isUp ? "text-green-400" : "text-red-400"}`}
               >
                  <span>{isUp ? "▲" : "▼"}</span>
                  {fmt(Math.abs(totalChange))} ({isUp ? "+" : ""}
                  {totalChangePercent.toFixed(2)}%) 24H
               </p>

               {/* Chart */}
               <div className="">
                  {chartLoading ? (
                     <div className="h-56 bg-white/5 animate-pulse rounded-xl" />
                  ) : chartPoints.length > 1 ? (
                     <ChartContainer
                        config={chartConfig}
                        className="h-64 w-full"
                     >
                        <AreaChart
                           data={chartPoints}
                           margin={{ top: 8, right: 4, left: 0, bottom: 20 }}
                        >
                           <defs>
                              <linearGradient
                                 id="portfolio-grad"
                                 x1="0"
                                 y1="0"
                                 x2="0"
                                 y2="1"
                              >
                                 <stop
                                    offset="5%"
                                    stopColor={color}
                                    stopOpacity={0.25}
                                 />
                                 <stop
                                    offset="95%"
                                    stopColor={color}
                                    stopOpacity={0}
                                 />
                              </linearGradient>
                           </defs>
                           <CartesianGrid
                              vertical={false}
                              stroke="rgba(255,255,255,0.06)"
                              strokeDasharray="5 5"
                           />
                           <XAxis
                              dataKey="t"
                              tickFormatter={(t) => formatDate(t, chartRange)}
                              tick={{
                                 fill: "rgba(255,255,255,0.3)",
                                 fontSize: 11,
                                 dy: 20,
                              }}
                              axisLine={false}
                              tickLine={false}
                              interval="preserveStartEnd"
                              minTickGap={60}
                           />
                           <YAxis
                              orientation="right"
                              domain={[minV - pad, maxV + pad]}
                              allowDataOverflow
                              tickCount={5}
                              tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                              tick={{
                                 fill: "rgba(255,255,255,0.3)",
                                 fontSize: 11,
                              }}
                              axisLine={false}
                              tickLine={false}
                              width={55}
                           />
                           <Tooltip
                              contentStyle={{
                                 background: "#1a1a1a",
                                 border: "1px solid rgba(255,255,255,0.1)",
                                 borderRadius: 12,
                                 color: "#fff",
                                 fontSize: 12,
                              }}
                              labelFormatter={(t) =>
                                 formatDate(t as number, chartRange)
                              }
                              formatter={(v) => [
                                 `$${Number(v).toFixed(2)}`,
                                 "Portfolio Value",
                              ]}
                           />
                           <Area
                              type="monotone"
                              dataKey="value"
                              stroke={color}
                              strokeWidth={2}
                              fill="url(#portfolio-grad)"
                              dot={false}
                              isAnimationActive={false}
                           />
                        </AreaChart>
                     </ChartContainer>
                  ) : (
                     <div className="h-64 flex items-center justify-center text-white/20 text-sm">
                        No chart data available
                     </div>
                  )}
               </div>
            </div>

            {/* Strategy Composition table */}
            <div className="space-y-3 mt-8">
               {/* Title row */}
               <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">
                     Strategy Composition
                  </h2>
                  <button
                     onClick={() => fetchPortfolio(true)}
                     disabled={refreshing}
                     className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer disabled:opacity-50"
                  >
                     <RefreshCw
                        size={12}
                        className={refreshing ? "animate-spin" : ""}
                     />
                     Refresh
                  </button>
               </div>

               {/* Search + controls row */}
               <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="flex-1 flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-4 py-2.5">
                     <Search size={15} className="text-white/30 shrink-0" />
                     <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search asset name or ticker"
                        className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none w-full"
                     />
                  </div>

                  {/* View toggle */}
                  <div className="flex items-center bg-[#1a1a1a] rounded-xl p-1 gap-0.5">
                     <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-[#2a2a2a] text-white" : "text-white/30 hover:text-white/60"}`}
                     >
                        <LayoutList size={15} />
                     </button>
                     <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-[#2a2a2a] text-white" : "text-white/30 hover:text-white/60"}`}
                     >
                        <LayoutGrid size={15} />
                     </button>
                  </div>

                  {/* Sort */}
                  <div className="relative">
                     <select
                        value={sortBy}
                        onChange={(e) =>
                           setSortBy(e.target.value as typeof sortBy)
                        }
                        className="appearance-none bg-[#1a1a1a] text-white/70 text-sm rounded-xl pl-4 pr-8 py-2.5 outline-none cursor-pointer hover:bg-[#222] transition-colors"
                     >
                        <option value="weight">By Weight</option>
                        <option value="price">By Price</option>
                        <option value="change">By 24h Change</option>
                     </select>
                     <ChevronDown
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                     />
                  </div>
               </div>

               <div className="bg-[#111] rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/5">
                     {[
                        "Token name",
                        "Weight",
                        "Current price",
                        "Market cap",
                        "24h",
                     ].map((col, i) => (
                        <span
                           key={col}
                           className={`text-white/30 text-xs font-medium ${i > 0 ? "text-right" : ""}`}
                        >
                           {col}
                        </span>
                     ))}
                  </div>

                  {/* Rows */}
                  {data.holdings
                     .filter((h) => {
                        const q = search.toLowerCase();
                        return (
                           !q ||
                           h.name.toLowerCase().includes(q) ||
                           h.ticker.toLowerCase().includes(q)
                        );
                     })
                     .sort((a, b) => {
                        if (sortBy === "price") return b.price - a.price;
                        if (sortBy === "change")
                           return (
                              (b.changePercent ?? 0) - (a.changePercent ?? 0)
                           );
                        return b.value - a.value; // weight
                     })
                     .map((h) => {
                        const weight =
                           data.totalValue > 0
                              ? (h.value / data.totalValue) * 100
                              : 0;
                        const stock = STOCKS.find(
                           (s) => s.tokenTicker === h.tokenTicker,
                        );
                        const rowUp = (h.changePercent ?? 0) >= 0;

                        return (
                           <div
                              key={h.ticker}
                              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                           >
                              <div className="flex items-center gap-3">
                                 <span className="text-2xl leading-none">
                                    {h.logo}
                                 </span>
                                 <div>
                                    <p className="text-white font-semibold text-sm">
                                       {h.name}
                                    </p>
                                    <p className="text-white/40 text-xs">
                                       {h.ticker}
                                    </p>
                                 </div>
                              </div>
                              <span className="text-white text-sm self-center text-right">
                                 {weight.toFixed(2)}%
                              </span>
                              <span className="text-white text-sm self-center text-right">
                                 $
                                 {h.price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                 })}
                              </span>
                              <span className="text-white/60 text-sm self-center text-right">
                                 {stock?.marketCap ?? "—"}
                              </span>
                              <span
                                 className={`text-sm self-center text-right font-medium ${h.changePercent !== undefined ? (rowUp ? "text-green-400" : "text-red-400") : "text-white/30"}`}
                              >
                                 {h.changePercent !== undefined
                                    ? `${rowUp ? "↑" : "↓"} ${Math.abs(h.changePercent).toFixed(2)}%`
                                    : "—"}
                              </span>
                           </div>
                        );
                     })}
               </div>
            </div>
         </div>
      </ScrollArea>
   );
}
