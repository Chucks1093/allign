"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronDown, Search, Check } from "lucide-react";
import { STOCKS } from "@/lib/stocks/tokens";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Holding {
  ticker: string;
  name: string;
  logo: string;
  tokenTicker: string;
  shares: number;
  price: number;
  value: number;
}

interface Props {
  holdings: Holding[];
  selected: Holding | null;
  onSelect: (h: Holding) => void;
  tokenAmount: string;
  onTokenAmountChange: (tokenAmount: string) => void;
}

export default function StockAmountInput({ holdings, selected, onSelect, tokenAmount, onTokenAmountChange }: Props) {
  const [isDollar, setIsDollar] = useState(true);
  const [rawInput, setRawInput] = useState("");
  const [search, setSearch] = useState("");

  const price = selected?.price ?? 0;
  const maxShares = selected?.shares ?? 0;
  const maxDollars = maxShares * price;

  const parsed = parseFloat(rawInput) || 0;
  const equivalent = isDollar
    ? price > 0 ? (parsed / price).toFixed(6) : "0"
    : (parsed * price).toFixed(2);

  function handleInput(val: string) {
    setRawInput(val);
    const n = parseFloat(val) || 0;
    onTokenAmountChange(isDollar ? (price > 0 ? (n / price).toFixed(6) : "0") : val);
  }

  function toggle() {
    const n = parseFloat(rawInput) || 0;
    const converted = isDollar
      ? (price > 0 ? (n / price).toFixed(6) : "0")
      : (n * price).toFixed(2);
    setRawInput(converted);
    onTokenAmountChange(isDollar ? converted : (price > 0 ? (parseFloat(converted) / price).toFixed(6) : "0"));
    setIsDollar(v => !v);
  }

  function useMax() {
    const val = isDollar ? maxDollars.toFixed(2) : maxShares.toFixed(6);
    setRawInput(val);
    onTokenAmountChange(maxShares.toFixed(6));
  }

  const selectedStock = selected ? STOCKS.find(s => s.tokenTicker === selected.tokenTicker) : null;

  const filtered = holdings.filter(h => {
    const stock = STOCKS.find(s => s.tokenTicker === h.tokenTicker);
    const q = search.toLowerCase();
    return (
      h.tokenTicker.toLowerCase().includes(q) ||
      (stock?.name ?? h.name).toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#0c0c0c] border border-[#2a2a2a] rounded-sm p-4 space-y-3 focus-within:border-white/20 transition-colors">
      <p className="text-[11px] font-mono uppercase tracking-widest text-white/40">Amount</p>

      {/* Amount + selector on same row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-baseline gap-0.5 min-w-0">
          {isDollar && <span className="text-white text-3xl font-bold">$</span>}
          <input
            type="number"
            value={rawInput}
            onChange={e => handleInput(e.target.value)}
            placeholder="0.00"
            className="flex-1 min-w-0 bg-transparent text-white text-3xl font-bold outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Stock pill selector */}
        <Popover>
          <PopoverTrigger
            className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5 hover:border-white/20 transition-colors cursor-pointer shrink-0"
          >
            {selectedStock
              ? <img src={selectedStock.logo} alt={selectedStock.name} width={20} height={20} className="rounded-full bg-white p-px shrink-0" />
              : <div className="w-5 h-5 rounded-full bg-white/10" />
            }
            <span className="text-white text-sm font-medium">{selected?.tokenTicker ?? "Select"}</span>
            <ChevronDown size={13} className="text-white/40" />
          </PopoverTrigger>

          <PopoverContent side="bottom" align="end" sideOffset={6} className="w-72 p-0 bg-[#111] border border-[#2a2a2a] rounded-sm shadow-xl">
            <div className="border-b border-[#2a2a2a] flex items-center gap-2 px-3">
              <Search size={13} className="text-white/30 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 outline-none"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-[12px] text-white/30">No stocks found.</p>
              )}
              {filtered.map((h, idx) => {
                const stock = STOCKS.find(s => s.tokenTicker === h.tokenTicker);
                const isSelected = selected?.tokenTicker === h.tokenTicker;
                return (
                  <button
                    key={h.ticker}
                    onClick={() => { onSelect(h); setSearch(""); }}
                    className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer text-left ${idx < filtered.length - 1 ? "border-b border-[#1a1a1a]" : ""} ${isSelected ? "bg-white/5" : ""}`}
                  >
                    {stock && <img src={stock.logo} alt={stock.name} width={36} height={36} className="rounded-full bg-white p-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{stock?.name ?? h.name}</p>
                      <p className="text-white/40 text-xs">{h.tokenTicker}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm">{h.shares.toFixed(4)} {h.tokenTicker}</p>
                      <p className="text-white/40 text-xs">${(h.shares * h.price).toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <button onClick={toggle} className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors cursor-pointer">
          <span className="text-[12px]">
            {isDollar
              ? `${equivalent} ${selected?.tokenTicker ?? "tokens"}`
              : `$${equivalent}`}
          </span>
          <ArrowUpDown size={11} className="shrink-0" />
        </button>
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-white/30">
            {isDollar ? `$${maxDollars.toFixed(2)}` : `${maxShares.toFixed(6)} ${selected?.tokenTicker ?? ""}`}
          </span>
          <span className="text-white/20 mx-0.5">·</span>
          <button onClick={useMax} className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium">
            Use max
          </button>
        </div>
      </div>
    </div>
  );
}
