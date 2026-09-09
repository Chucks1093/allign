"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { type StockPrice } from "@/lib/stocks/prices";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockCardProps {
  data: StockPrice;
}

export default function StockCard({ data }: StockCardProps) {
  const { stock, price, error, changePercent } = data;
  const isUp = (changePercent ?? 0) >= 0;
  const router = useRouter();
  const [points, setPoints] = useState<{ t: number; price: number }[]>([]);

  useEffect(() => {
    fetch(`/api/history?tokenTicker=${stock.tokenTicker}&range=1M`)
      .then((r) => r.json())
      .then((d) => { if (d.points?.length) setPoints(d.points); })
      .catch(() => {});
  }, [stock.tokenTicker]);

  const color = isUp ? "#22c55e" : "#ef4444";
  const chartConfig: ChartConfig = { price: { label: "Price", color } };

  const prices = points.map((p) => p.price);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const range = maxP - minP;
  const pad = range > 0 ? range * 0.05 : minP * 0.002;

  return (
    <div
      onClick={() => router.push(`/app/explore/${stock.tokenTicker}`)}
      className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:bg-[#222] transition-colors overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <img
              src={stock.logo}
              alt={stock.name}
              width={36}
              height={36}
              className="rounded-full bg-white p-0.5"
            />
            <img
              src="/icons/base.svg"
              alt="Base"
              width={13}
              height={13}
              className="absolute -bottom-0.5 -right-0.5 rounded border-[2px] border-[#1a1a1a]"
            />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{stock.name}</p>
            <p className="text-white/40 text-xs">{stock.ticker}</p>
          </div>
        </div>
        {changePercent !== undefined ? (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? "+" : ""}{changePercent}%
          </div>
        ) : (
          <div className="text-xs text-white/20">—</div>
        )}
      </div>

      {/* Price */}
      <div>
        <p className="text-white font-bold text-xl">
          {error ? "—" : `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        {stock.marketCap && <p className="text-white/60 text-xs mt-0.5">Mkt Cap {stock.marketCap}</p>}
      </div>

      {/* Sparkline */}
      <div className="-mx-4 -mb-4">
        {points.length > 1 ? (
          <ChartContainer config={chartConfig} className="h-20 w-full">
            <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[minP - pad, maxP + pad]} hide />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#g-${stock.ticker})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-20 bg-white/[0.03] animate-pulse" />
        )}
      </div>
    </div>
  );
}
