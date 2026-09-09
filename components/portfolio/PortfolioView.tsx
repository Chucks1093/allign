"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { RefreshCw, Search } from "lucide-react";
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
   const allTs = [
      ...new Set(results.flatMap((r) => r.points.map((p) => p.t))),
   ].sort((a, b) => a - b);
   return allTs.map((t) => {
      let total = 0;
      for (const { shares, points } of results) {
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
            setData(await res.json());
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
         <div className="h-full flex items-center justify-center">
            <p className="text-white/40 text-sm">
               Connect your wallet to view your portfolio
            </p>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="h-full px-8 py-8 space-y-4">
            <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
         </div>
      );
   }

   if (error) {
      return (
         <div className="h-full flex flex-col items-center justify-center gap-3">
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
         <div className="h-full flex flex-col items-center justify-center gap-3">
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

   const totalChange = data.holdings.reduce(
      (sum, h) =>
         h.changePercent !== undefined
            ? sum + (h.value * h.changePercent) / 100
            : sum,
      0,
   );
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
      <ScrollArea className="h-full">
         <div className="px-8 py-8 flex flex-col gap-6">
            {/* Logo stack + total value — outside the card */}
            <div className="flex items-center gap-4">
               <div className="flex items-center">
                  {data.holdings.slice(0, 7).map((h, i) => {
                     const stock = STOCKS.find(
                        (s) => s.tokenTicker === h.tokenTicker,
                     );
                     return (
                        <img
                           key={h.tokenTicker}
                           src={stock?.logo ?? h.logo}
                           alt={h.name}
                           width={40}
                           height={40}
                           className="rounded-full bg-white p-0.5 border-2 border-transparent"
                           style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i }}
                        />
                     );
                  })}
                  {data.holdings.length > 7 && (
                     <div
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 font-semibold"
                        style={{ marginLeft: -10, zIndex: 7 }}
                     >
                        +{data.holdings.length - 7}
                     </div>
                  )}
               </div>
               <p className="text-white text-2xl font-semibold font-montserrat">
                  Total value ({fmt(data.totalValue)})
               </p>
            </div>

            {/* Chart card */}
            <div className="bg-[#181818] rounded-2xl p-5">
               <div className="flex items-center justify-between mb-5">
                  <p
                     className={`flex items-center gap-1.5 text-sm font-medium ${isUp ? "text-green-400" : "text-red-400"}`}
                  >
                     <span>{isUp ? "▲" : "▼"}</span>
                     {fmt(Math.abs(totalChange))} ({isUp ? "+" : ""}
                     {totalChangePercent.toFixed(2)}%) 24H
                  </p>
                  <div className="flex items-center gap-0.5 bg-[#242424] rounded-full px-1.5 py-1.5 shrink-0">
                     {RANGES.map((r) => (
                        <button
                           key={r}
                           onClick={() => setChartRange(r)}
                           className={`px-3.5 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${chartRange === r ? "bg-[#3a3a3a] text-white shadow" : "text-white/40 hover:text-white/70"}`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>
               {chartLoading ? (
                  <div className="h-56 bg-white/5 animate-pulse rounded-xl" />
               ) : chartPoints.length > 1 ? (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
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

            {/* Holdings table */}
            <div>
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <h2 className="text-white text-2xl font-semibold shrink-0">
                        Holdings
                     </h2>
                     <button
                        onClick={() => fetchPortfolio(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                     >
                        <RefreshCw
                           size={12}
                           className={refreshing ? "animate-spin" : ""}
                        />
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

               <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#111]">
                  {/* Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
                     <span className="text-white/30 text-xs font-medium">Token</span>
                     <span className="text-white/30 text-xs font-medium text-right">Weight</span>
                     <span className="text-white/30 text-xs font-medium text-right">Shares</span>
                     <span className="text-white/30 text-xs font-medium text-right">Value</span>
                     <span className="text-white/30 text-xs font-medium text-right">Price</span>
                     <span className="text-white/30 text-xs font-medium text-right">24H</span>
                  </div>

                  {/* Rows */}
                  {data.holdings
                     .filter((h) => {
                        if (!search.trim()) return true;
                        const q = search.toLowerCase();
                        return (
                           h.name.toLowerCase().includes(q) ||
                           h.ticker.toLowerCase().includes(q) ||
                           h.tokenTicker.toLowerCase().includes(q)
                        );
                     })
                     .map((h, idx, arr) => {
                        const stock = STOCKS.find(
                           (s) => s.tokenTicker === h.tokenTicker,
                        );
                        const rowUp = (h.changePercent ?? 0) >= 0;
                        return (
                           <a
                              key={h.ticker}
                              href={`/app/explore/${h.tokenTicker}`}
                              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                           >
                              <div className="flex items-center gap-3">
                                 <div className="relative shrink-0">
                                    <img
                                       src={stock?.logo ?? h.logo}
                                       alt={h.name}
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
                                    <p className="text-white font-semibold text-sm leading-tight">
                                       {h.ticker}
                                    </p>
                                    <p className="text-white/40 text-xs mt-0.5">
                                       {h.name}
                                    </p>
                                 </div>
                              </div>
                              <p className="text-white/60 text-sm text-right">
                                 {data.totalValue > 0 ? ((h.value / data.totalValue) * 100).toFixed(2) : "0.00"}%
                              </p>
                              <p className="text-white/60 text-sm text-right">
                                 {h.shares.toFixed(6)}
                              </p>
                              <p className="text-white font-medium text-sm text-right">
                                 {fmt(h.value)}
                              </p>
                              <p className="text-white font-medium text-sm text-right">
                                 $
                                 {h.price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                 })}
                              </p>
                              <p
                                 className={`text-sm font-medium text-right ${h.changePercent !== undefined ? (rowUp ? "text-emerald-400" : "text-red-400") : "text-white/30"}`}
                              >
                                 {h.changePercent !== undefined
                                    ? `${rowUp ? "+" : ""}${h.changePercent.toFixed(2)}%`
                                    : "—"}
                              </p>
                           </a>
                        );
                     })}
               </div>
            </div>
         </div>
      </ScrollArea>
   );
}
