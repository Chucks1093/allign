"use client";

import { Send, Plus, TrendingUp, Brain, BarChart2, Gift, Layers } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { STOCKS } from "@/lib/stocks/tokens";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CAPABILITY_CARDS = [
   {
      icon: TrendingUp,
      title: "Buy US Stocks",
      desc: "Buy any tokenized stock on Base with USDC",
      prompt: "Show available stocks",
   },
   {
      icon: Brain,
      title: "AI Trading Agent",
      desc: "Let AI trade automatically on your behalf",
      prompt: "Activate AI agent",
   },
   {
      icon: BarChart2,
      title: "Market Trends",
      desc: "See what's trending and declining today",
      prompt: "What's trending today?",
   },
   {
      icon: Layers,
      title: "My Portfolio",
      desc: "View your current holdings and performance",
      prompt: "Show my portfolio",
   },
];

const QUICK_COMMANDS = [
   "Show available stocks",
   "What's trending today?",
   "What's declining today?",
   "Show my portfolio",
   "What's Apple's price?",
   "Activate AI agent",
];

interface EmptyChatProps {
   input: string;
   onInputChange: (val: string) => void;
   onSend: () => void;
}

interface TickerItem {
   ticker: string;
   tokenTicker: string;
   logo: string;
   price: number;
   changePercent: number;
}

export default function EmptyChat({
   input,
   onInputChange,
   onSend,
}: EmptyChatProps) {
   const [tickers, setTickers] = useState<TickerItem[]>([]);

   useEffect(() => {
      fetch("/api/prices")
         .then((r) => r.json())
         .then((data) => {
            if (Array.isArray(data)) {
               const items: TickerItem[] = data
                  .filter((d: any) => d.price && !d.error)
                  .map((d: any) => {
                     const stock = STOCKS.find((s) => s.ticker === d.ticker);
                     return {
                        ticker: d.ticker,
                        tokenTicker: d.tokenTicker,
                        logo: stock?.logo ?? "🔹",
                        price: d.price,
                        changePercent: d.changePercent ?? 0,
                     };
                  });
               setTickers(items);
            }
         })
         .catch(() => {});
   }, []);

   const items = tickers.length > 0 ? [...tickers, ...tickers] : [];

   return (
      <div className="flex flex-col flex-1 h-full">
         {/* Centered content */}
         <div className="flex flex-col flex-1 items-center justify-center gap-6 px-4 relative bottom-10">
            <div className="flex items-center gap-2.5">
               <div className="w-9 h-9 rounded-md bg-white/90 flex items-center justify-center shrink-0">
                  <Image src="/logo.svg" alt="Allign" width={22} height={22} className="invert" />
               </div>
               <span className="font-montserrat text-white/90 font-semibold text-[1.6rem] tracking-tight">Allign</span>
            </div>

            <h1 className="text-white text-3xl md:text-4xl font-semibold tracking-tight text-center font-manrope">
               Trade smartly with An Agent
            </h1>

            {/* Desktop: 2x2 grid */}
            <div className="hidden md:grid grid-cols-2 gap-3 w-full max-w-2xl">
               {CAPABILITY_CARDS.map(({ icon: Icon, title, desc, prompt }) => (
                  <button
                     key={title}
                     type="button"
                     onClick={() => onInputChange(prompt)}
                     className="flex flex-col gap-2 text-left bg-[#161616] hover:bg-[#1e1e1e] border border-white/10 hover:border-white/20 rounded-lg p-4 transition-all cursor-pointer group"
                  >
                     <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors mb-2">
                        <Icon size={24} className="text-white/70" />
                     </div>
                     <div>
                        <p className="text-white text-base font-semibold leading-tight">{title}</p>
                        <p className="text-white/40 text-sm mt-0.5 leading-snug">{desc}</p>
                     </div>
                  </button>
               ))}
            </div>

            {/* Mobile: horizontal scroll carousel */}
            <div className="md:hidden w-full overflow-x-auto flex gap-3 pb-1 snap-x snap-mandatory scrollbar-hide px-4">
               {CAPABILITY_CARDS.map(({ icon: Icon, title, desc, prompt }) => (
                  <button
                     key={title}
                     type="button"
                     onClick={() => onInputChange(prompt)}
                     className="flex flex-col gap-2 text-left bg-[#161616] border border-white/10 rounded-lg p-4 transition-all cursor-pointer shrink-0 w-[60vw] snap-start"
                  >
                     <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                        <Icon size={24} className="text-white/70" />
                     </div>
                     <div>
                        <p className="text-white text-base font-semibold leading-tight">{title}</p>
                        <p className="text-white/40 text-sm mt-0.5 leading-snug">{desc}</p>
                     </div>
                  </button>
               ))}
            </div>

         </div>

         {/* Input pinned to bottom */}
         <div className="shrink-0 px-4 pb-2 pt-2 flex justify-center">
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
                           className="text-white/70 hover:text-white cursor-pointer text-sm py-2.5"
                        >
                           {cmd}
                        </DropdownMenuItem>
                     ))}
                  </DropdownMenuContent>
               </DropdownMenu>
               <input
                  type="text"
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                  placeholder="Ask me to buy NVIDIA, check your portfolio..."
                  className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/30 text-base font-medium outline-none"
               />
               <button
                  type="button"
                  onClick={onSend}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-full bg-white/80 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
               >
                  <Send size={14} className="text-black" />
               </button>
            </div>
         </div>
         <p className="text-center text-white/60 text-[11px] pb-3">Available to eligible non-US users only</p>
      </div>
   );
}
