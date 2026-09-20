"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   Tooltip,
   CartesianGrid,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Copy, ExternalLink, Globe, TrendingUp, TrendingDown } from "lucide-react";
import {
   Breadcrumb,
   BreadcrumbList,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbSeparator,
   BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STOCKS } from "@/lib/stocks/tokens";
import { useStockPrices } from "@/hooks/useStockPrices";
import BuyModal from "@/components/trade/BuyModal";
import TradeCard from "@/components/trade/TradeCard";

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

interface Point {
   t: number;
   price: number;
}

function formatDate(t: number, range: Range) {
   const d = new Date(t * 1000);
   if (range === "1D")
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
   if (range === "1Y")
      return d.toLocaleDateString([], { month: "short", year: "2-digit" });
   return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmt(v: number) {
   return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StockTooltip({ active, payload, label, range }: any) {
   if (!active || !payload?.length) return null;
   const date = formatDate(label, range);
   return (
      <div className="bg-white rounded-xl px-3 py-2 shadow-xl text-[11px] leading-5">
         <p className="text-gray-900"><span className="font-bold">Price</span> ${fmt(payload[0].value)}</p>
         <p className="text-gray-900"><span className="font-bold">Date</span> {date}</p>
      </div>
   );
}

export default function StockDetailPage({
   params,
}: {
   params: Promise<{ ticker: string }>;
}) {
   const { ticker } = use(params);

   const stock = STOCKS.find((s) => s.tokenTicker === ticker);
   const { stocks } = useStockPrices();
   const priceData = stocks.find((s) => s.stock.tokenTicker === ticker);

   const { address } = useAccount();

   const [range, setRange] = useState<Range>("1D");
   const [points, setPoints] = useState<Point[]>([]);
   const [loadingChart, setLoadingChart] = useState(true);
   const [showModal, setShowModal] = useState(false);
   const [tab, setTab] = useState<"Buy" | "Sell">("Buy");
   const [isMobile, setIsMobile] = useState(false);
   const [holding, setHolding] = useState<{ shares: number; value: number } | null>(null);

   useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
   }, []);

   useEffect(() => {
      if (!address) return;
      fetch(`/api/portfolio?address=${address}`)
         .then((r) => r.json())
         .then((d) => {
            const h = d.holdings?.find((x: any) => x.tokenTicker === ticker);
            setHolding(h ? { shares: h.shares, value: h.value } : null);
         })
         .catch(() => {});
   }, [address, ticker]);

   useEffect(() => {
      if (!stock) return;
      setLoadingChart(true);
      setPoints([]);
      fetch(`/api/history?tokenTicker=${stock.tokenTicker}&range=${range}`)
         .then((r) => r.json())
         .then((d) => {
            if (d.points?.length) setPoints(d.points);
         })
         .catch(() => {})
         .finally(() => setLoadingChart(false));
   }, [stock?.tokenTicker, range]);

   if (!stock)
      return (
         <div className="flex items-center justify-center h-full text-white/40">
            Stock not found
         </div>
      );

   const price = priceData?.price ?? 0;
   const changePercent = priceData?.changePercent ?? 0;
   const isUp = changePercent >= 0;
   const color = isUp ? "#22c55e" : "#ef4444";
   const chartConfig: ChartConfig = { price: { label: "Price", color } };

   const moreStocks = STOCKS.filter((s) => s.tokenTicker !== stock.tokenTicker).slice(0, 5);

   const prices = points.map((p) => p.price);
   let minP = 0, maxP = 0;
   for (const v of prices) {
      if (v < minP || minP === 0) minP = v;
      if (v > maxP) maxP = v;
   }
   const priceRange = maxP - minP;
   const pad = priceRange > 0 ? priceRange * 0.005 : minP * 0.001;

   return (
      <ScrollArea className="h-full">
         <div className="px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 max-w-6xl mx-auto">

            {/* Breadcrumb */}
            <Breadcrumb>
               <BreadcrumbList className="text-base">
                  <BreadcrumbItem>
                     <BreadcrumbLink
                        render={<Link href="/app/explore" />}
                        className="text-white/40 hover:text-white font-semibold cursor-pointer"
                     >
                        All Stocks
                     </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-white/20" />
                  <BreadcrumbItem>
                     <BreadcrumbPage className="text-white font-semibold">
                        {stock.ticker}
                     </BreadcrumbPage>
                  </BreadcrumbItem>
               </BreadcrumbList>
            </Breadcrumb>

            {/* Stock identity */}
            <div className="flex items-center gap-3">
               <div className="relative shrink-0">
                  <img src={stock.logo} alt={stock.name} width={48} height={48} className="rounded-full bg-white p-0.5" />
                  <img src="/icons/base.svg" alt="Base" width={18} height={18} className="absolute -bottom-1 -right-1 rounded border-[2.5px] border-[#0d0d0d]" />
               </div>
               <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                     <h1 className="text-white text-2xl font-bold leading-tight">{stock.name}</h1>
                     <span className="text-white/40 text-lg font-medium">{stock.tokenTicker}</span>
                  </div>
                  {holding && (
                     <p className="text-white/50 text-xs mt-0.5">
                        You hold <span className="text-white/80 font-semibold">{holding.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} shares</span> · <span className="text-white/80 font-semibold">${fmt(holding.value)}</span>
                     </p>
                  )}
               </div>
            </div>

            {/* Two-column: stacked on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

            {/* LEFT */}
            <div className="flex flex-col gap-6 min-w-0">

            {/* Chart card */}
            <div className="bg-[#181818] rounded-xl p-4 md:p-5 border border-white/[0.06]">
               {/* Price row */}
               <div className="flex items-center justify-between mb-1 gap-3">
                  <p className="text-white text-xl md:text-2xl font-bold tracking-tight font-montserrat">
                     {price > 0 ? `$${fmt(price)}` : "—"}
                  </p>
                  <div className="flex items-center gap-0.5 bg-[#242424] rounded-full px-1.5 py-1.5 shrink-0">
                     {RANGES.map((r) => (
                        <button
                           key={r}
                           onClick={() => setRange(r)}
                           className={`px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer ${
                              range === r ? "bg-[#3a3a3a] text-white shadow" : "text-white/40 hover:text-white/70"
                           }`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Change */}
               <p className={`flex items-center gap-1.5 text-sm font-medium mb-5 ${isUp ? "text-green-400" : "text-red-400"}`}>
                  <span>{isUp ? "▲" : "▼"}</span>$
                  {Math.abs((price * changePercent) / 100).toFixed(2)} (
                  {isUp ? "+" : ""}{changePercent.toFixed(2)}%) 24H
               </p>

               {/* Chart */}
               {loadingChart ? (
                  <div className="h-64 bg-white/5 animate-pulse rounded-xl" />
               ) : points.length > 1 ? (
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                     <AreaChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 20 }}>
                        <defs>
                           <linearGradient id="detail-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="5 5" />
                        <XAxis
                           dataKey="t"
                           tickFormatter={(t) => formatDate(t, range)}
                           tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, dy: 8 }}
                           axisLine={false}
                           tickLine={false}
                           interval="preserveStartEnd"
                           minTickGap={60}
                        />
                        <YAxis
                           hide={isMobile}
                           orientation="right"
                           domain={[minP - pad, maxP + pad]}
                           allowDataOverflow
                           tickCount={6}
                           tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                           tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                           axisLine={false}
                           tickLine={false}
                           width={55}
                        />
                        <Tooltip
                           content={<StockTooltip range={range} />}
                           cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Area
                           type="monotone"
                           dataKey="price"
                           stroke={color}
                           strokeWidth={2}
                           fill="url(#detail-grad)"
                           dot={false}
                           activeDot={{ r: 4, fill: color, stroke: "white", strokeWidth: 2 }}
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

            {/* Trade card — mobile only, right after chart */}
            <div className="block lg:hidden">
               <TradeCard stock={stock} price={price} />
            </div>

            {/* About */}
            {stock.description && (
               <div className="space-y-3">
                  <h2 className="text-white font-bold text-lg">About</h2>
                  <div className="bg-[#181818] rounded-xl p-5 border border-white/[0.06]">
                     <p className="text-white font-semibold text-sm mb-2">
                        {stock.name} ({stock.ticker})
                     </p>
                     <p className="text-white/50 text-sm leading-relaxed">
                        {stock.description}
                     </p>
                  </div>
               </div>
            )}

            {/* Stock Details */}
            <div className="space-y-6">
               <div className="space-y-2">
                  <p className="text-white font-semibold text-base">Classification</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[
                        { label: "Type", value: "Stock" },
                        { label: "Sector / Industry", value: stock.sector },
                        { label: "Factor / Risk Profile", value: "Growth, Large Cap" },
                        { label: "Region", value: "US" },
                        { label: "Asset Class", value: "Equities, Equity" },
                     ].map(({ label, value }) => (
                        <div key={label} className="bg-[#181818] border border-white/[0.06] rounded-xl px-4 py-3">
                           <p className="text-white/40 text-xs mb-1">{label}</p>
                           <p className="text-white text-sm font-semibold">{value}</p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-2">
                  <p className="text-white font-semibold text-base">Company Metrics</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[
                        { label: "Market Cap", value: stock.marketCap },
                        { label: "Primary Exchange", value: stock.exchange },
                        { label: "Employees", value: stock.employees },
                     ]
                        .filter(({ value }) => !!value)
                        .map(({ label, value }) => (
                           <div key={label} className="bg-[#181818] border border-white/[0.06] rounded-xl px-4 py-3">
                              <p className="text-white/40 text-xs mb-1">{label}</p>
                              <p className="text-white text-sm font-semibold">{value}</p>
                           </div>
                        ))}
                  </div>
               </div>
            </div>

            {/* Links & Info */}
            <div className="space-y-3">
               <h2 className="text-white font-bold text-lg">Links & Info</h2>
               <div className="bg-[#181818] rounded-xl overflow-hidden border border-white/[0.06] divide-y divide-white/[0.04]">
                  <div className="flex items-center justify-between px-5 py-4">
                     <span className="text-white/40 text-sm">Contract</span>
                     <button
                        onClick={() => navigator.clipboard.writeText(stock.contract)}
                        className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-mono transition-colors cursor-pointer"
                     >
                        {stock.contract.slice(0, 6)}...{stock.contract.slice(-4)}
                        <Copy size={12} />
                     </button>
                  </div>
                  <a
                     href={`https://basescan.org/token/${stock.contract}`}
                     target="_blank"
                     rel="noreferrer"
                     className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
                  >
                     <span className="text-white/40 text-sm">Explorer</span>
                     <span className="flex items-center gap-1.5 text-white/70 text-sm">
                        Basescan <ExternalLink size={12} />
                     </span>
                  </a>
                  {stock.website && (
                     <a
                        href={`https://${stock.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
                     >
                        <span className="text-white/40 text-sm">Website</span>
                        <span className="flex items-center gap-1.5 text-white/70 text-sm">
                           <Globe size={12} /> {stock.website}
                        </span>
                     </a>
                  )}
               </div>
            </div>

            {/* More Stocks */}
            <div className="space-y-3">
               <h2 className="text-white font-bold text-lg">More Stocks</h2>
               <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 md:-mx-5 px-4 md:px-5 scrollbar-hide">
                  {moreStocks.map((s) => {
                     const d = stocks.find((x) => x.stock.tokenTicker === s.tokenTicker);
                     const sPrice = d?.price ?? 0;
                     const sChg = d?.changePercent;
                     const sUp = (sChg ?? 0) >= 0;
                     return (
                        <Link
                           key={s.tokenTicker}
                           href={`/app/explore/${s.tokenTicker}`}
                           className="bg-[#181818] border border-white/[0.06] rounded-xl p-4 hover:border-white/20 transition-colors shrink-0 w-56"
                        >
                           <div className="flex items-center gap-2.5 mb-4">
                              <div className="relative shrink-0">
                                 <img src={s.logo} alt={s.name} width={38} height={38} className="rounded-full bg-white p-0.5" />
                                 <img src="/icons/base.svg" alt="Base" width={13} height={13} className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-[#181818]" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-white font-semibold text-xs leading-tight truncate">{s.name}</p>
                                 <p className="text-white/40 text-xs mt-0.5">{s.tokenTicker}</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-between gap-2">
                              <p className="text-white text-sm font-bold">
                                 {sPrice > 0 ? `$${sPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                              </p>
                              {sChg !== undefined && (
                                 <p className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${sUp ? "text-emerald-400" : "text-red-400"}`}>
                                    {sUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {sUp ? "+" : ""}{sChg.toFixed(2)}%
                                 </p>
                              )}
                           </div>
                        </Link>
                     );
                  })}
               </div>
            </div>

            </div>{/* end LEFT */}

            {/* RIGHT — sticky trade card, desktop only */}
            <div className="hidden lg:block sticky top-8">
               <TradeCard stock={stock} price={price} />
            </div>

            </div>{/* end two-column grid */}
         </div>

         {showModal && price > 0 && (
            <BuyModal
               stock={stock}
               price={price}
               initialTab={tab}
               onClose={() => setShowModal(false)}
            />
         )}
      </ScrollArea>
   );
}
