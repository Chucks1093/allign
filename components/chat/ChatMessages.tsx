"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const publicClient = createPublicClient({ chain: base, transport: http() });

function useUsdcBalance() {
   const { address } = useAccount();
   const [balance, setBalance] = useState<string | null>(null);
   useEffect(() => {
      if (!address) {
         setBalance(null);
         return;
      }
      publicClient
         .readContract({
            address: USDC,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
         })
         .then((raw) => setBalance((Number(raw) / 1e6).toFixed(2)))
         .catch(() => setBalance("0.00"));
   }, [address]);
   return balance;
}
import { UIMessage } from "@ai-sdk/react";
import {
   TrendingUp,
   TrendingDown,
   AlertCircle,
   Loader2,
   Brain,
   Send,
   ExternalLink,
   Plus,
   Trash2,
   MessageCircle,
   Wallet,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_COMMANDS = [
   "Show available stocks",
   "What's trending today?",
   "What's declining today?",
   "Show my portfolio",
   "What's Apple's price?",
   "Activate AI agent",
];

interface PortfolioHolding {
   ticker: string;
   name: string;
   logo: string;
   tokenTicker: string;
   marketCap?: string;
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

function PortfolioCard({ part }: { part: any }) {
   if (part.state === "input") {
      return (
         <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40">
            <Loader2 size={13} className="animate-spin" />
            Loading portfolio…
         </div>
      );
   }

   if (part.state === "error" || part.output?.error) {
      return (
         <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle size={13} />
            {part.output?.error ?? "Failed to load portfolio"}
         </div>
      );
   }

   const p: PortfolioOutput = part.output;
   if (!p || p.holdings.length === 0) {
      return (
         <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40">
            No tokenized stocks in your wallet yet.
         </div>
      );
   }

   return (
      <div className="space-y-2 w-full">
         <div className="flex items-center">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wide">
               Your Portfolio
            </p>
         </div>
         <div className="grid grid-cols-2 gap-2">
            {p.holdings.map((h) => {
               const isPositive = (h.changePercent ?? 0) >= 0;
               return (
                  <div
                     key={h.ticker}
                     className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 flex flex-col gap-4"
                  >
                     {/* Top: logo + name */}
                     <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                           <img
                              src={h.logo}
                              alt={h.name}
                              width={32}
                              height={32}
                              className="rounded-full bg-white p-0.5"
                           />
                           <img
                              src="/icons/base.svg"
                              alt="Base"
                              width={12}
                              height={12}
                              className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-white/80"
                           />
                        </div>
                        <div className="min-w-0">
                           <p className="text-white font-semibold text-sm leading-tight truncate">
                              {h.name}
                           </p>
                           <p className="text-white/40 text-[11px]">
                              {h.ticker}
                           </p>
                        </div>
                     </div>
                     {/* Bottom: price+marketcap left | shares+change right */}
                     <div className="flex items-end justify-between">
                        <div>
                           <p className="text-white text-sm font-bold leading-none">
                              ${h.value.toFixed(2)}
                           </p>
                           <p className="text-white/30 text-[11px] mt-1">
                              {h.marketCap ? `Mkt ${h.marketCap}` : "—"}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-white text-sm font-bold leading-none">
                              {h.shares.toFixed(4)}{" "}
                              <span className="text-white/50 font-medium">
                                 {h.tokenTicker}
                              </span>
                           </p>
                           {h.changePercent !== undefined && (
                              <p
                                 className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 mt-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                              >
                                 {isPositive ? (
                                    <TrendingUp size={10} />
                                 ) : (
                                    <TrendingDown size={10} />
                                 )}
                                 {isPositive ? "+" : ""}
                                 {h.changePercent.toFixed(2)}%
                              </p>
                           )}
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
   );
}

interface QuoteOutput {
   sym: string;
   name?: string;
   logo?: string;
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
   _traded?: boolean;
}

interface ChatMessagesProps {
   messages: UIMessage[];
   isLoading: boolean;
   input: string;
   onInputChange: (val: string) => void;
   onSend: () => void;
   onClearChat: () => void;
   onOpenTrade: (
      sym: string,
      side: "buy" | "sell",
      price: number,
      initialAmount?: string,
   ) => void;
   onExecuteTrade: (
      sym: string,
      side: "buy" | "sell",
      amount: string,
      name: string,
      toolCallId: string,
   ) => void;
   onConfirmAgent: (budgetUSD: number, periodDays: number, messageId: string) => void;
   onRejectAgent: () => void;
   isAgentActing: boolean;
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

   const isPositive = (p.changePercent ?? 0) >= 0;

   return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 w-[260px]">
         {/* Logo + name row */}
         <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
               <img
                  src={p.logo}
                  alt={p.name}
                  width={42}
                  height={42}
                  className="rounded-full bg-white p-0.5"
               />
               <img
                  src="/icons/base.svg"
                  alt="Base"
                  width={15}
                  height={15}
                  className="absolute -bottom-0.5 -right-0.5 rounded border-[2.5px] border-white/80"
               />
            </div>
            <div>
               <p className="text-white font-semibold text-sm">{p.name}</p>
               <p className="text-white/40 text-xs mt-0.5">{p.sym}</p>
            </div>
         </div>

         {/* Price row */}
         <div className="flex items-start justify-between">
            <div>
               <p className="text-white text-base font-bold leading-none">
                  $
                  {p.price.toLocaleString("en-US", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                  })}
               </p>
               <p className="text-white/30 text-xs mt-1.5">
                  Market cap {p.marketCap ?? "—"}
               </p>
            </div>
            {p.changePercent !== undefined && (
               <div className="text-right">
                  <p className="text-white/30 text-xs mb-1">24h change</p>
                  <p
                     className={`text-sm font-semibold flex items-center justify-end gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                  >
                     {isPositive ? (
                        <TrendingUp size={12} />
                     ) : (
                        <TrendingDown size={12} />
                     )}
                     {isPositive ? "+" : ""}
                     {p.changePercent.toFixed(2)}%
                  </p>
               </div>
            )}
         </div>
      </div>
   );
}

function StockMiniCard({ s }: { s: any }) {
   const isPositive = (s.changePercent ?? 0) >= 0;
   return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 flex flex-col gap-4">
         <div className="flex items-center gap-2">
            <div className="relative shrink-0">
               <img
                  src={s.logo}
                  alt={s.name}
                  width={32}
                  height={32}
                  className="rounded-full bg-white p-0.5"
               />
               <img
                  src="/icons/base.svg"
                  alt="Base"
                  width={12}
                  height={12}
                  className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-white/80"
               />
            </div>
            <div className="min-w-0">
               <p className="text-white font-semibold text-sm leading-tight truncate">
                  {s.name}
               </p>
               <p className="text-white/40 text-[11px]">{s.sym}</p>
            </div>
         </div>
         <div className="flex items-end justify-between">
            <div>
               <p className="text-white text-sm font-bold leading-none">
                  $
                  {s.price.toLocaleString("en-US", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                  })}
               </p>
               {s.marketCap && (
                  <p className="text-white/30 text-[11px] mt-1">
                     Mkt {s.marketCap}
                  </p>
               )}
            </div>
            {s.changePercent !== undefined && (
               <p
                  className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}
               >
                  {isPositive ? (
                     <TrendingUp size={11} />
                  ) : (
                     <TrendingDown size={11} />
                  )}
                  {isPositive ? "+" : ""}
                  {s.changePercent.toFixed(2)}%
               </p>
            )}
         </div>
      </div>
   );
}

function StockGridCard({ part, title }: { part: any; title: string }) {
   if (part.state === "input") {
      return (
         <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40">
            <Loader2 size={13} className="animate-spin" />
            Loading stocks…
         </div>
      );
   }
   if (part.state === "error" || part.output?.error) {
      return (
         <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle size={13} />
            {part.output?.error ?? "Failed to load stocks"}
         </div>
      );
   }
   const stocks: any[] = part.output?.stocks ?? [];
   return (
      <div className="space-y-2 w-full">
         <p className="text-white/40 text-xs font-medium uppercase tracking-wide">
            {title}
         </p>
         <div className="grid grid-cols-2 gap-2">
            {stocks.map((s) => (
               <StockMiniCard key={s.sym} s={s} />
            ))}
         </div>
      </div>
   );
}

const RANGES = ["1D", "1W", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

function StockDetailsCard({ part }: { part: any }) {
   const [range, setRange] = useState<Range>("1M");
   const [chartPoints, setChartPoints] = useState<{ t: number; price: number }[]>([]);
   const [chartLoading, setChartLoading] = useState(false);

   const d = part.output;

   useEffect(() => {
      if (!d?.sym) return;
      setChartLoading(true);
      fetch(`/api/history?tokenTicker=${d.sym}&range=${range}`)
         .then((r) => r.json())
         .then((data) => setChartPoints(data.points ?? []))
         .catch(() => setChartPoints([]))
         .finally(() => setChartLoading(false));
   }, [d?.sym, range]);

   if (part.state === "input") {
      return (
         <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40">
            <Loader2 size={13} className="animate-spin" />
            Loading stock details…
         </div>
      );
   }
   if (part.state === "error" || d?.error) {
      return (
         <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400">
            <AlertCircle size={13} />
            {d?.error ?? "Failed to load details"}
         </div>
      );
   }
   if (!d) return null;

   const isPositive = (d.changePercent ?? 0) >= 0;
   const chartColor = isPositive ? "#34d399" : "#f87171";

   // chart range change %
   const chartFirst = chartPoints[0]?.price;
   const chartLast = chartPoints[chartPoints.length - 1]?.price;
   const chartChangePct = chartFirst && chartLast
      ? ((chartLast - chartFirst) / chartFirst) * 100
      : null;
   const chartUp = (chartChangePct ?? 0) >= 0;

   const priceMin = chartPoints.length ? Math.min(...chartPoints.map((p) => p.price)) : 0;
   const priceMax = chartPoints.length ? Math.max(...chartPoints.map((p) => p.price)) : 0;
   const padding = (priceMax - priceMin) * 0.1 || 1;

   return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden w-full sm:w-3/4">
         {/* Chart area */}
         <div className="px-4 pt-4 pb-1">
            {/* Header: logo + name + price */}
            <div className="flex items-center gap-3 mb-4">
               <div className="relative shrink-0">
                  <img
                     src={d.logo}
                     alt={d.name}
                     width={40}
                     height={40}
                     className="rounded-full bg-white p-0.5"
                  />
                  <img
                     src="/icons/base.svg"
                     alt="Base"
                     width={13}
                     height={13}
                     className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-white/80"
                  />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">{d.name}</p>
                  <p className="text-white/40 text-[11px]">{d.sym} · {d.exchange}</p>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-white font-bold text-base leading-tight">
                     ${d.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {chartChangePct !== null ? (
                     <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${chartUp ? "text-emerald-400" : "text-red-400"}`}>
                        {chartUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {chartUp ? "+" : ""}{chartChangePct.toFixed(2)}% {range}
                     </p>
                  ) : d.changePercent !== undefined ? (
                     <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {isPositive ? "+" : ""}{d.changePercent.toFixed(2)}%
                     </p>
                  ) : null}
               </div>
            </div>

            {/* Chart */}
            <div className="h-[140px] w-full relative">
               {chartLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Loader2 size={16} className="animate-spin text-white/20" />
                  </div>
               ) : chartPoints.length > 1 ? (
                  <StockChart
                     data={chartPoints}
                     color={chartUp ? "#34d399" : "#f87171"}
                     min={priceMin - padding}
                     max={priceMax + padding}
                  />
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">No data</div>
               )}
            </div>

            {/* Range tabs */}
            <div className="flex gap-1 justify-end mt-2 mb-1">
               {RANGES.map((r) => (
                  <button
                     key={r}
                     onClick={() => setRange(r)}
                     className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        range === r ? "bg-white/15 text-white" : "text-white/30 hover:text-white/60"
                     }`}
                  >
                     {r}
                  </button>
               ))}
            </div>
         </div>

         {/* Divider */}
         <div className="border-t border-white/8 mx-4" />

         {/* Details section */}
         <div className="p-4 flex flex-col gap-3">
            {d.description && (
               <p className="text-white/50 text-[12px] leading-relaxed">{d.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
               {d.marketCap && (
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                     <p className="text-white/30 text-[10px] mb-0.5">Market Cap</p>
                     <p className="text-white text-xs font-semibold">{d.marketCap}</p>
                  </div>
               )}
               {d.sector && (
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                     <p className="text-white/30 text-[10px] mb-0.5">Sector</p>
                     <p className="text-white text-xs font-semibold leading-tight">{d.sector}</p>
                  </div>
               )}
               {d.employees && (
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                     <p className="text-white/30 text-[10px] mb-0.5">Employees</p>
                     <p className="text-white text-xs font-semibold">{d.employees}</p>
                  </div>
               )}
               {d.website && (
                  <div className="bg-white/5 rounded-xl px-3 py-2">
                     <p className="text-white/30 text-[10px] mb-0.5">Website</p>
                     <a
                        href={`https://${d.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-xs font-semibold flex items-center gap-1 hover:text-white/70 transition-colors"
                     >
                        {d.website} <ExternalLink size={9} />
                     </a>
                  </div>
               )}
            </div>

            {!d.tradable && (
               <p className="text-yellow-400/70 text-[11px] text-center">Not yet tradable on Allign</p>
            )}
         </div>
      </div>
   );
}

function StockChart({
   data,
   color,
   min,
   max,
}: {
   data: { t: number; price: number }[];
   color: string;
   min: number;
   max: number;
}) {
   const { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, CartesianGrid } = require("recharts");
   const [activeIndex, setActiveIndex] = useState<number | null>(null);

   const chartData = useMemo(
      () =>
         data.map((p, i) => ({
            t: p.t,
            solid:
               activeIndex === null || i <= activeIndex ? p.price : null,
            dashed:
               activeIndex !== null && i >= activeIndex ? p.price : null,
         })),
      [data, activeIndex]
   );

   const CustomTooltip = ({ active }: any) => {
      if (!active || activeIndex === null) return null;
      const point = data[activeIndex];
      if (!point) return null;
      const date = new Date(point.t * 1000).toLocaleDateString("en-US", {
         month: "short",
         day: "numeric",
         year: "numeric",
      });
      return (
         <div className="bg-white rounded-xl px-3 py-2 shadow-xl text-[11px] leading-5">
            <p className="text-gray-900">
               <span className="font-bold">Price</span>{" "}
               US${point.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-900">
               <span className="font-bold">Date</span> {date}
            </p>
         </div>
      );
   };

   return (
      <ResponsiveContainer width="100%" height="100%">
         <LineChart
            data={chartData}
            margin={{ top: 4, right: 0, left: 0, bottom: 4 }}
            onMouseMove={(state: any) => {
               if (state?.activeTooltipIndex !== undefined) {
                  setActiveIndex(state.activeTooltipIndex);
               }
            }}
            onMouseLeave={() => setActiveIndex(null)}
         >
            <YAxis domain={[min, max]} hide />
            <CartesianGrid
               strokeDasharray="4 4"
               stroke="rgba(255,255,255,0.06)"
               vertical={false}
               horizontal={true}
            />
            <Tooltip
               content={<CustomTooltip />}
               cursor={{
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
               }}
            />
            {/* Solid line — left of cursor */}
            <Line
               type="monotone"
               dataKey="solid"
               stroke={color}
               strokeWidth={1.5}
               dot={false}
               activeDot={{ r: 4, fill: color, stroke: "white", strokeWidth: 2 }}
               connectNulls={false}
               isAnimationActive={false}
            />
            {/* Dashed faded line — right of cursor */}
            <Line
               type="monotone"
               dataKey="dashed"
               stroke={color}
               strokeWidth={1.5}
               strokeDasharray="5 4"
               strokeOpacity={0.35}
               dot={false}
               activeDot={false}
               connectNulls={false}
               isAnimationActive={false}
            />
         </LineChart>
      </ResponsiveContainer>
   );
}

function QuoteCard({
   part,
   onOpenTrade,
   onExecuteTrade,
}: {
   part: any;
   onOpenTrade: ChatMessagesProps["onOpenTrade"];
   onExecuteTrade: ChatMessagesProps["onExecuteTrade"];
}) {
   const usdcBalance = useUsdcBalance();
   const [traded, setTraded] = useState(() => !!part.output?._traded);

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
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-7 pt-4 pb-4 w-full sm:w-[calc(50%-4px)] flex flex-col gap-4">
         {/* Buy / Sell tabs */}
         <div className="flex w-fit bg-white/5 rounded-lg p-0.5 mx-auto mb-5">
            <span
               className={`text-xs font-semibold px-5 py-1.5 rounded-md transition-all ${isBuy ? "bg-white/15 text-white" : "text-white/30"}`}
            >
               Buy
            </span>
            <span
               className={`text-xs font-semibold px-5 py-1.5 rounded-md transition-all ${!isBuy ? "bg-white/15 text-white" : "text-white/30"}`}
            >
               Sell
            </span>
         </div>

         {/* Centered logo + name + ticker */}
         <div className="flex flex-col items-center gap-1.5">
            {q.logo && (
               <div className="relative shrink-0">
                  <img
                     src={q.logo}
                     alt={q.name}
                     width={44}
                     height={44}
                     className="rounded-full bg-white p-0.5"
                  />
                  <img
                     src="/icons/base.svg"
                     alt="Base"
                     width={15}
                     height={15}
                     className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-white/80"
                  />
               </div>
            )}
            <p className="text-white font-semibold text-sm leading-tight">
               {q.name ?? q.sym}
            </p>
            <p className="text-white/40 text-[11px]">{q.sym}</p>
         </div>

         {/* You spend left | You receive right */}
         <div className="flex items-end justify-between">
            <div>
               <p className="text-white/30 text-[11px] mb-1">
                  {isBuy ? "You spend" : "You sell"}
               </p>
               <p className="text-white text-base font-bold leading-none">
                  {isBuy
                     ? `$${parseFloat(q.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                     : `${q.amount} ${q.sym}`}
                  <span className="text-white/40 font-normal text-xs ml-1">
                     {isBuy ? "USDC" : ""}
                  </span>
               </p>
            </div>
            <div className="text-right">
               <p className="text-white/30 text-[11px] mb-1">You receive</p>
               <p className="text-white text-base font-bold leading-none">
                  {q.amountOut}{" "}
                  <span className="text-white/50 font-medium text-xs">
                     {q.receiveUnit}
                  </span>
               </p>
            </div>
         </div>

         {deviation && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400">
               <AlertCircle size={11} />
               Price deviates {q.vsFeedPct.toFixed(2)}% from feed — trade
               disabled
            </div>
         )}

         {/* Trade button */}
         <button
            onClick={() => {
               if (traded || deviation) return;
               setTraded(true);
               onExecuteTrade(q.sym, q.side, q.amount, q.name ?? q.sym, part.toolCallId);
            }}
            disabled={deviation || traded}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all mt-3 ${
               deviation || traded
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-white/90 hover:bg-white text-black cursor-pointer"
            }`}
         >
            <span className="flex items-center justify-center gap-2">
               <Wallet size={14} />
               {traded ? "Order sent…" : isBuy ? `Buy ${q.sym}` : `Sell ${q.sym}`}
            </span>
         </button>

         <p className="text-center text-[11px] text-white/60">
            You have{" "}
            <span className="text-white/90 font-medium">
               ${usdcBalance ?? "0.00"} USDC
            </span>{" "}
            on Base
         </p>
      </div>
   );
}

function parseAgentTag(
   text: string,
): { budgetUSD: number; periodDays: number } | null {
   const m = text.match(
      /\[ACTION:ACTIVATE_AGENT\s+budgetUSD=(\d+(?:\.\d+)?)\s+periodDays=(\d+)\]/,
   );
   if (!m) return null;
   return { budgetUSD: parseFloat(m[1]), periodDays: parseInt(m[2], 10) };
}

function stripAgentTag(text: string): string {
   return text.replace(/\[ACTION:ACTIVATE_AGENT[^\]]*\]/g, "").trim();
}

function AgentActivationCard({
   budgetUSD,
   periodDays,
   messageId,
   initialConfirmed,
   onConfirm,
   onReject,
   isActing,
}: {
   budgetUSD: number;
   periodDays: number;
   messageId: string;
   initialConfirmed: boolean;
   onConfirm: (budget: number, period: number, messageId: string) => void;
   onReject: () => void;
   isActing: boolean;
}) {
   const [confirmed, setConfirmed] = useState(initialConfirmed);

   return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-7 py-7 w-full sm:w-[calc(50%-4px)] flex flex-col gap-4">
         {/* Header */}
         <div className="flex flex-col items-center gap-1.5">
            <div className="relative w-14 h-14 mb-2">
               <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Brain size={26} className="text-white" />
               </div>
               <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded bg-white/90 border-[2.5px] border-white/80 flex items-center justify-center">
                  <img
                     src="/logo.svg"
                     alt="Allign"
                     className="w-4.5 h-4.5 invert"
                  />
               </div>
            </div>
            <p className="text-white font-semibold text-md font-manrope">
               Allign AI Agent
            </p>
            <p className="text-white/40 text-sm">
               One wallet signature required
            </p>
         </div>

         {/* Details */}
         <div className="flex items-end justify-between mt-4">
            <div>
               <p className="text-white/30 text-[11px] mb-1">Daily budget</p>
               <p className="text-white text-base font-bold leading-none">
                  ${budgetUSD}{" "}
                  <span className="text-white/50 font-medium text-xs">
                     USDC
                  </span>
               </p>
            </div>
            <div className="text-right">
               <p className="text-white/30 text-[11px] mb-1">Period</p>
               <p className="text-white text-base font-bold leading-none">
                  {periodDays}{" "}
                  <span className="text-white/50 font-medium text-xs">
                     days
                  </span>
               </p>
            </div>
         </div>

         {/* Buttons */}
         <div className="flex flex-col items-center gap-2 mt-3">
            <button
               onClick={() => {
                  if (confirmed || isActing) return;
                  setConfirmed(true);
                  onConfirm(budgetUSD, periodDays, messageId);
               }}
               disabled={isActing || confirmed}
               className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActing || confirmed
                     ? "bg-white/5 text-white/20 cursor-not-allowed"
                     : "bg-white/90 hover:bg-white text-black cursor-pointer"
               }`}
            >
               {isActing ? (
                  <span className="flex items-center justify-center gap-1.5">
                     <Loader2 size={13} className="animate-spin" /> Signing…
                  </span>
               ) : confirmed ? (
                  <span className="flex items-center justify-center gap-2">Agent Active</span>
               ) : (
                  <span className="flex items-center justify-center gap-2">
                     <Wallet size={13} /> Confirm
                  </span>
               )}
            </button>
            <p className="text-white/50 text-[10px] text-center">
               This gives Allign permission to run trades on your behalf
            </p>
         </div>
      </div>
   );
}

export default function ChatMessages({
   messages,
   isLoading,
   input,
   onInputChange,
   onSend,
   onClearChat,
   onOpenTrade,
   onExecuteTrade,
   onConfirmAgent,
   onRejectAgent,
   isAgentActing,
}: ChatMessagesProps) {
   const bottomRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <ScrollArea className="flex-1 min-h-0">
            <div className="px-8 py-8 space-y-10 max-w-3xl mx-auto">
               {messages.map((msg) => {
                  if (msg.role === "user") {
                     const text = msg.parts
                        .filter((p) => p.type === "text")
                        .map((p: any) => p.text)
                        .join("");
                     // Hide internal context messages sent to AI
                     if (
                        text.startsWith("__trade_result__") ||
                        text.startsWith("__trade_failed__") ||
                        text.startsWith("__agent_activated__") ||
                        text.startsWith("__agent_failed__")
                     )
                        return null;
                     return (
                        <div key={msg.id} className="flex justify-end">
                           <div className="max-w-[70%] bg-[#1a1a1a] text-white rounded-2xl rounded-br-sm px-4 py-3 text-base font-medium leading-relaxed">
                              {text}
                           </div>
                        </div>
                     );
                  }

                  // Assistant message — render each part
                  return (
                     <div
                        key={msg.id}
                        className="flex flex-col gap-3 items-start"
                     >
                        {msg.parts.map((part: any, i: number) => {
                           if (part.type === "text" && part.text) {
                              const agentTag = parseAgentTag(part.text);
                              const displayText = stripAgentTag(part.text);
                              return (
                                 <div
                                    key={i}
                                    className="flex flex-col gap-3 w-full"
                                 >
                                    {displayText && (
                                       <MarkdownMessage content={displayText} />
                                    )}
                                    {agentTag && (
                                       <AgentActivationCard
                                          budgetUSD={agentTag.budgetUSD}
                                          periodDays={agentTag.periodDays}
                                          messageId={msg.id}
                                          initialConfirmed={!!(msg as any)._agentConfirmed}
                                          onConfirm={onConfirmAgent}
                                          onReject={onRejectAgent}
                                          isActing={isAgentActing}
                                       />
                                    )}
                                 </div>
                              );
                           }
                           if (part.type === "tool-getQuote") {
                              return (
                                 <QuoteCard
                                    key={i}
                                    part={part}
                                    onOpenTrade={onOpenTrade}
                                    onExecuteTrade={onExecuteTrade}
                                 />
                              );
                           }
                           if (part.type === "tool-getPortfolio") {
                              return <PortfolioCard key={i} part={part} />;
                           }
                           if (part.type === "tool-getPrice") {
                              return <PriceCard key={i} part={part} />;
                           }
                           if (part.type === "tool-getAvailableStocks") {
                              return (
                                 <StockGridCard
                                    key={i}
                                    part={part}
                                    title="Available Stocks"
                                 />
                              );
                           }
                           if (part.type === "tool-getTrendingStocks") {
                              return (
                                 <StockGridCard
                                    key={i}
                                    part={part}
                                    title="Top Performers Today"
                                 />
                              );
                           }
                           if (part.type === "tool-getDecliningStocks") {
                              return (
                                 <StockGridCard
                                    key={i}
                                    part={part}
                                    title="Declining Today"
                                 />
                              );
                           }
                           if (part.type === "tool-getStockDetails") {
                              return <StockDetailsCard key={i} part={part} />;
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
         <div className="px-4 pb-2 pt-2 flex justify-center">
            <div className="w-full max-w-2xl bg-[#272727] rounded-full pl-2 pr-2 py-2 flex items-center gap-3">
               <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center justify-center shrink-0 cursor-pointer text-white/50 hover:text-white transition-colors pl-2">
                     <Plus size={22} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="start"
                     className="bg-[#1a1a1a] border border-white/10 rounded-xl w-56"
                  >
                     {QUICK_COMMANDS.map((cmd) => (
                        <DropdownMenuItem
                           key={cmd}
                           onClick={() => onInputChange(cmd)}
                           className="flex items-center gap-2.5 text-white/70 hover:text-white cursor-pointer text-sm py-2.5"
                        >
                           <MessageCircle
                              size={14}
                              className="text-white/40 shrink-0"
                           />
                           {cmd}
                        </DropdownMenuItem>
                     ))}
                     <DropdownMenuSeparator className="bg-white/10 my-1" />
                     <DropdownMenuItem
                        onClick={onClearChat}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer text-sm py-2.5"
                     >
                        <Trash2 size={14} />
                        Clear Chat
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
               <input
                  type="text"
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                  placeholder="Ask me to buy NVIDIA, check your portfolio..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base font-medium outline-none"
               />

               <button
                  type="button"
                  onClick={onSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
               >
                  <Send size={14} className="text-black" />
               </button>
            </div>
         </div>
         <p className="text-center text-white/60 text-[11px] pb-3">
            Available to eligible non-US users only
         </p>
      </div>
   );
}
