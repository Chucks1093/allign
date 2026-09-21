"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { RefreshCw, Search, Wallet, Globe, PieChart } from "lucide-react";
import Link from "next/link";
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

function PortfolioTooltip({ active, payload, label }: any) {
   if (!active || !payload?.length) return null;
   const date = new Date(label * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
   return (
      <div className="bg-white rounded-xl px-3 py-2 shadow-xl text-[11px] leading-5">
         <p className="text-gray-900"><span className="font-bold">Value</span> {fmt(payload[0].value)}</p>
         <p className="text-gray-900"><span className="font-bold">Date</span> {date}</p>
      </div>
   );
}

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

   // O(H×P) pre-pass: one pointer per holding advances forward, never resets
   const pointers = results.map(() => 0);

   return allTs.map((t) => {
      let total = 0;
      for (let h = 0; h < results.length; h++) {
         const { shares, points } = results[h];
         while (pointers[h] + 1 < points.length && points[pointers[h] + 1].t <= t) {
            pointers[h]++;
         }
         if (points.length > 0 && points[pointers[h]].t <= t) {
            total += points[pointers[h]].price * shares;
         }
      }
      return { t, value: total };
   });
}

const TABLE_HEADER = (
   <div className="grid grid-cols-[2fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
      <span className="text-white/30 text-xs font-medium">Token</span>
      <span className="text-white/30 text-xs font-medium text-right hidden md:block">Weight</span>
      <span className="text-white/30 text-xs font-medium text-right hidden md:block">Shares</span>
      <span className="text-white/30 text-xs font-medium text-right">Value</span>
      <span className="text-white/30 text-xs font-medium text-right hidden md:block">Price</span>
      <span className="text-white/30 text-xs font-medium text-right">24H</span>
   </div>
);

export default function PortfolioView() {
   const { authenticated, login } = usePrivy();
   const { address } = useAccount();
   const [data, setData] = useState<PortfolioData | null>(null);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [chartRange, setChartRange] = useState<Range>("1M");
   const [chartPoints, setChartPoints] = useState<Point[]>([]);
   const [chartLoading, setChartLoading] = useState(false);
   const [search, setSearch] = useState("");
   const [isMobile, setIsMobile] = useState(false);

   useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
   }, []);

   const fetchPortfolio = useCallback(
      async (isRefresh = false) => {
         if (!authenticated || !address) return;
         if (isRefresh) setRefreshing(true);
         else setLoading(true);
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
      [authenticated, address],
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

   if (!authenticated) {
      return (
         <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#181818]">
               {TABLE_HEADER}
               <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <Wallet size={36} className="text-white/20" />
                  <p className="text-white/40 text-sm">Connect your wallet to view your portfolio</p>
                  <button onClick={login}
                     className="flex items-center gap-2 px-6 py-1.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer">
                     <Wallet size={15} /> Connect wallet
                  </button>
               </div>
            </div>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 max-w-6xl mx-auto">
            {/* Logo stack + title */}
            <div className="flex flex-col gap-3">
               <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                     <div key={i} className="w-12 h-12 rounded-full bg-white/10 animate-pulse border-2 border-[#0e0e0e]" style={{ marginLeft: i === 0 ? 0 : -14 }} />
                  ))}
               </div>
               <div className="space-y-2">
                  <div className="h-7 w-40 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-4 w-28 bg-white/5 rounded-lg animate-pulse" />
               </div>
            </div>
            {/* Chart */}
            <div className="bg-[#181818] rounded-xl p-4 md:p-5 border border-white/[0.06]">
               <div className="flex items-center justify-between mb-5">
                  <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-36 bg-white/10 rounded-full animate-pulse" />
               </div>
               <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
            </div>
            {/* Table */}
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#181818]">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < 4 ? "border-b border-white/[0.04]" : ""}`}>
                     <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse shrink-0" />
                     <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-16 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                     </div>
                     <div className="h-4 w-14 bg-white/10 rounded animate-pulse" />
                     <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                  </div>
               ))}
            </div>
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
         <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#181818]">
               {TABLE_HEADER}
               <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <PieChart size={36} className="text-white/20" />
                  <p className="text-white/40 text-sm">You don't have any stocks</p>
                  <Link href="/app/explore"
                     className="flex items-center gap-2 px-6 py-1.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors">
                     <Globe size={15} /> Get stocks
                  </Link>
               </div>
            </div>
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

   let minV = Infinity, maxV = -Infinity;
   for (const p of chartPoints) {
      if (p.value < minV) minV = p.value;
      if (p.value > maxV) maxV = p.value;
   }
   if (!chartPoints.length) { minV = 0; maxV = 0; }
   const vRange = maxV - minV;
   const pad = vRange > 0 ? vRange * 0.005 : minV * 0.001;

   return (
      <ScrollArea className="h-full">
         <div className="px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 max-w-6xl mx-auto">

            {/* Logo stack + total value */}
            <div className="flex flex-col gap-3">
               <div className="flex items-center">
                  {data.holdings.slice(0, 7).map((h, i) => {
                     const stock = STOCKS.find((s) => s.tokenTicker === h.tokenTicker);
                     return (
                        <img
                           key={h.tokenTicker}
                           src={stock?.logo ?? h.logo}
                           alt={h.name}
                           width={48}
                           height={48}
                           className="rounded-full bg-white p-0.5 border-2 border-[#0e0e0e]"
                           style={{ marginLeft: i === 0 ? 0 : -14, zIndex: i }}
                        />
                     );
                  })}
                  {data.holdings.length > 7 && (
                     <div
                        className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60 font-semibold border-2 border-[#0e0e0e]"
                        style={{ marginLeft: -14, zIndex: 7 }}
                     >
                        +{data.holdings.length - 7}
                     </div>
                  )}
               </div>
               <div>
                  <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">My Portfolio</h1>
                  <p className="text-white/40 text-sm mt-1">{fmt(data.totalValue)} total value</p>
               </div>
            </div>

            {/* Chart card */}
            <div className="bg-[#181818] rounded-xl p-4 md:p-5 border border-white/[0.06]">
               <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <p className={`flex items-center gap-1.5 text-sm font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
                     <span>{isUp ? "▲" : "▼"}</span>
                     {fmt(Math.abs(totalChange))} ({isUp ? "+" : ""}{totalChangePercent.toFixed(2)}%) 24H
                  </p>
                  <div className="flex items-center gap-0.5 bg-[#242424] rounded-full px-1.5 py-1.5 shrink-0">
                     {RANGES.map((r) => (
                        <button
                           key={r}
                           onClick={() => setChartRange(r)}
                           className={`px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer ${chartRange === r ? "bg-[#3a3a3a] text-white shadow" : "text-white/40 hover:text-white/70"}`}
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
                     <AreaChart data={chartPoints} margin={{ top: 8, right: 0, left: 0, bottom: 20 }}>
                        <defs>
                           <linearGradient id="portfolio-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <XAxis
                           dataKey="t"
                           tickFormatter={(t) => formatDate(t, chartRange)}
                           tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, dy: 20 }}
                           axisLine={false}
                           tickLine={false}
                           interval="preserveStartEnd"
                           minTickGap={60}
                        />
                        <YAxis
                           hide={isMobile}
                           orientation="right"
                           domain={[minV - pad, maxV + pad]}
                           allowDataOverflow
                           tickCount={5}
                           tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                           tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                           axisLine={false}
                           tickLine={false}
                           width={45}
                        />
                        <Tooltip
                           content={<PortfolioTooltip />}
                           cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Area
                           type="monotone"
                           dataKey="value"
                           stroke={color}
                           strokeWidth={2}
                           fill="url(#portfolio-grad)"
                           dot={false}
                           activeDot={{ r: 4, fill: color, stroke: "white", strokeWidth: 2 }}
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
               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                     <h2 className="text-white text-2xl font-semibold shrink-0">Holdings</h2>
                     <button
                        onClick={() => fetchPortfolio(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                     >
                        <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                     </button>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-full md:w-72">
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

               <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#181818]">
                  {TABLE_HEADER}

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
                        const stock = STOCKS.find((s) => s.tokenTicker === h.tokenTicker);
                        const rowUp = (h.changePercent ?? 0) >= 0;
                        return (
                           <Link
                              key={h.ticker}
                              href={`/app/explore/${h.tokenTicker}`}
                              className={`grid grid-cols-[2fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}
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
                                       className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-[#181818]"
                                    />
                                 </div>
                                 <div>
                                    <p className="text-white font-semibold text-sm leading-tight">{h.ticker}</p>
                                    <p className="text-white/40 text-xs mt-0.5">{h.name}</p>
                                 </div>
                              </div>
                              <p className="hidden md:block text-white/60 text-sm text-right">
                                 {data.totalValue > 0 ? ((h.value / data.totalValue) * 100).toFixed(2) : "0.00"}%
                              </p>
                              <p className="hidden md:block text-white/60 text-sm text-right">
                                 {h.shares.toFixed(6)}
                              </p>
                              <p className="text-white font-medium text-sm text-right">{fmt(h.value)}</p>
                              <p className="hidden md:block text-white font-medium text-sm text-right">
                                 ${h.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className={`text-sm font-medium text-right ${h.changePercent !== undefined ? (rowUp ? "text-emerald-400" : "text-red-400") : "text-white/30"}`}>
                                 {h.changePercent !== undefined ? `${rowUp ? "+" : ""}${h.changePercent.toFixed(2)}%` : "—"}
                              </p>
                           </Link>
                        );
                     })}
               </div>
            </div>
         </div>
      </ScrollArea>
   );
}
