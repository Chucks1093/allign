"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   Tooltip,
   CartesianGrid,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
   Breadcrumb,
   BreadcrumbList,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbSeparator,
   BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STRATEGIES } from "@/lib/stocks/strategies";
import { STOCKS } from "@/lib/stocks/tokens";
import { useStockPrices } from "@/hooks/useStockPrices";
import StrategyTradeCard from "@/components/trade/StrategyTradeCard";

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

interface Point {
   t: number;
   value: number;
}

function formatDate(t: number, range: Range) {
   const d = new Date(t * 1000);
   if (range === "1D")
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
   if (range === "1Y")
      return d.toLocaleDateString([], { month: "short", year: "2-digit" });
   return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function fetchWeightedChart(
   holdings: { ticker: string; weight: number }[],
   range: Range,
): Promise<Point[]> {
   const results = await Promise.all(
      holdings.map((h) =>
         fetch(`/api/history?tokenTicker=${h.ticker}&range=${range}`)
            .then((r) => r.json())
            .then((d) => ({
               weight: h.weight / 100,
               points: (d.points ?? []) as { t: number; price: number }[],
            }))
            .catch(() => ({ weight: h.weight / 100, points: [] })),
      ),
   );
   const allTs = [
      ...new Set(results.flatMap((r) => r.points.map((p) => p.t))),
   ].sort((a, b) => a - b);
   return allTs.map((t) => {
      let value = 0;
      for (const { weight, points } of results) {
         const prev = points.filter((p) => p.t <= t);
         if (prev.length > 0) value += prev[prev.length - 1].price * weight;
      }
      return { t, value };
   });
}

export default function StrategyPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
   const { id } = use(params);
   const router = useRouter();
   const strategy = STRATEGIES.find((s) => s.id === id);
   const { stocks } = useStockPrices();

   const [range, setRange] = useState<Range>("1M");
   const [points, setPoints] = useState<Point[]>([]);
   const [loadingChart, setLoadingChart] = useState(true);

   useEffect(() => {
      if (!strategy) return;
      setLoadingChart(true);
      fetchWeightedChart(strategy.holdings, range)
         .then(setPoints)
         .finally(() => setLoadingChart(false));
   }, [strategy?.id, range]);

   if (!strategy)
      return (
         <div className="flex items-center justify-center h-full text-white/40">
            Strategy not found
         </div>
      );

   const holdingStocks = strategy.holdings.map((h) => {
      const stock = STOCKS.find((s) => s.tokenTicker === h.ticker);
      const priceData = stocks.find((s) => s.stock.tokenTicker === h.ticker);
      return {
         ...h,
         stock,
         price: priceData?.price ?? 0,
         changePercent: priceData?.changePercent,
      };
   });

   // Weighted 24H change
   const weightedChange = holdingStocks.reduce((sum, h) => {
      if (h.changePercent === undefined) return sum;
      return sum + (h.changePercent * h.weight) / 100;
   }, 0);
   const isUp = weightedChange >= 0;
   const color = isUp ? "#22c55e" : "#ef4444";
   const chartConfig: ChartConfig = { value: { label: "Value", color } };

   const vals = points.map((p) => p.value);
   const minV = vals.length ? Math.min(...vals) : 0;
   const maxV = vals.length ? Math.max(...vals) : 0;
   const vRange = maxV - minV;
   const pad = vRange > 0 ? vRange * 0.005 : minV * 0.001;

   return (
      <ScrollArea className="h-full">
         <div className="px-8 py-8 flex flex-col gap-6">
            <Breadcrumb>
               <BreadcrumbList className="text-base">
                  <BreadcrumbItem>
                     <BreadcrumbLink
                        render={<button onClick={() => router.back()} />}
                        className="text-white/40 hover:text-white font-semibold cursor-pointer"
                     >
                        All Stocks
                     </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/20" />
                  <BreadcrumbItem>
                     <BreadcrumbPage className="text-white font-semibold">
                        {strategy.name}
                     </BreadcrumbPage>
                  </BreadcrumbItem>
               </BreadcrumbList>
            </Breadcrumb>

            {/* Identity — outside the card, full width */}
            <div className="flex items-center gap-4">
               <div className="flex items-center">
                  {holdingStocks.slice(0, 7).map((h, i) =>
                     h.stock ? (
                        <img key={h.ticker} src={h.stock.logo} alt={h.stock.name} width={44} height={44}
                           className="rounded-full bg-white p-0.5 border-2 border-transparent"
                           style={{ marginLeft: i === 0 ? 0 : -12, zIndex: i }} />
                     ) : null,
                  )}
               </div>
               <div>
                  <h1 className="text-white text-2xl font-bold leading-tight">{strategy.name}</h1>
                  <p className="text-white/40 text-sm mt-0.5">{strategy.tagline}</p>
               </div>
            </div>

            {/* Two-column: left scrolls, right sticks */}
            <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

            {/* LEFT */}
            <div className="flex flex-col gap-6 min-w-0">

            {/* Chart card */}
            <div className="bg-[#181818] rounded-2xl p-5">
               <div className="flex items-center justify-between mb-5">
                  <p
                     className={`flex items-center gap-1.5 text-sm font-medium ${isUp ? "text-green-400" : "text-red-400"}`}
                  >
                     <span>{isUp ? "▲" : "▼"}</span>
                     {isUp ? "+" : ""}
                     {weightedChange.toFixed(2)}% weighted 24H
                  </p>
                  <div className="flex items-center gap-0.5 bg-[#242424] rounded-full px-1.5 py-1.5">
                     {RANGES.map((r) => (
                        <button
                           key={r}
                           onClick={() => setRange(r)}
                           className={`px-3.5 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${range === r ? "bg-[#3a3a3a] text-white shadow" : "text-white/40 hover:text-white/70"}`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               {loadingChart ? (
                  <div className="h-64 bg-white/5 animate-pulse rounded-xl" />
               ) : points.length > 1 ? (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                     <AreaChart
                        data={points}
                        margin={{ top: 8, right: 4, left: 0, bottom: 20 }}
                     >
                        <defs>
                           <linearGradient
                              id="strategy-grad"
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
                           stroke="rgba(255,255,255,0.08)"
                           strokeDasharray="5 5"
                        />
                        <XAxis
                           dataKey="t"
                           tickFormatter={(t) => formatDate(t, range)}
                           tick={{
                              fill: "rgba(255,255,255,0.3)",
                              fontSize: 11,
                              dy: 8,
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
                           tickCount={6}
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
                              formatDate(t as number, range)
                           }
                           formatter={(v) => [
                              `$${Number(v).toFixed(2)}`,
                              "Value",
                           ]}
                        />
                        <Area
                           type="monotone"
                           dataKey="value"
                           stroke={color}
                           strokeWidth={2}
                           fill="url(#strategy-grad)"
                           dot={false}
                           isAnimationActive={false}
                        />
                     </AreaChart>
                  </ChartContainer>
               ) : (
                  <div className="h-64 flex items-center justify-center text-white/20 text-sm">
                     No data available
                  </div>
               )}
            </div>

            {/* About */}
            <div className="space-y-3">
               <h2 className="text-white font-bold text-lg">About</h2>
               <div className="bg-[#111] rounded-2xl p-5">
                  <p className="text-white font-semibold text-sm mb-2">
                     {strategy.name}
                  </p>
                  <p className="text-white/50 text-sm leading-relaxed">
                     {strategy.description}
                  </p>
               </div>
            </div>

            {/* Composition table */}
            <div>
               <h2 className="text-white text-2xl font-semibold mb-4">
                  Composition
               </h2>
               <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#111]">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
                     <span className="text-white/30 text-xs font-medium">
                        Token
                     </span>
                     <span className="text-white/30 text-xs font-medium text-right">
                        Weight
                     </span>
                     <span className="text-white/30 text-xs font-medium text-right">
                        Price
                     </span>
                     <span className="text-white/30 text-xs font-medium text-right">
                        24H
                     </span>
                  </div>
                  {holdingStocks.map((h, idx, arr) => {
                     const rowUp = (h.changePercent ?? 0) >= 0;
                     return (
                        <a
                           key={h.ticker}
                           href={`/app/explore/${h.ticker}`}
                           className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer ${idx < arr.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                        >
                           <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                 <img
                                    src={h.stock?.logo}
                                    alt={h.stock?.name}
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
                                    {h.stock?.ticker ?? h.ticker}
                                 </p>
                                 <p className="text-white/40 text-xs mt-0.5">
                                    {h.stock?.name}
                                 </p>
                              </div>
                           </div>
                           <p className="text-white/60 text-sm text-right">
                              {h.weight}%
                           </p>
                           <p className="text-white font-medium text-sm text-right">
                              {h.price > 0
                                 ? `$${h.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                 : "—"}
                           </p>
                           <p
                              className={`text-sm font-medium text-right ${h.changePercent !== undefined ? (rowUp ? "text-emerald-400" : "text-red-400") : "text-white/30"}`}
                           >
                              {h.changePercent !== undefined ? (
                                 <span className="flex items-center justify-end gap-1">
                                    {rowUp ? (
                                       <TrendingUp size={12} />
                                    ) : (
                                       <TrendingDown size={12} />
                                    )}
                                    {rowUp ? "+" : ""}
                                    {h.changePercent.toFixed(2)}%
                                 </span>
                              ) : (
                                 "—"
                              )}
                           </p>
                        </a>
                     );
                  })}
               </div>
            </div>

            </div>{/* end LEFT column */}

            {/* RIGHT — sticky trade card */}
            <div className="sticky top-8">
               <StrategyTradeCard strategy={strategy} />
            </div>

            </div>{/* end two-column grid */}

         </div>
      </ScrollArea>
   );
}
