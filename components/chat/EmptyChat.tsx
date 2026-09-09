"use client";

import { Send, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { STOCKS } from "@/lib/stocks/tokens";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
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
      <div className="flex flex-col flex-1 h-full relative bottom-12">
         {/* Centered content */}
         <div className="flex flex-col flex-1 items-center justify-center gap-6 px-4 ">
            <h1 className="text-white text-4xl font-bold tracking-tight text-center font-manrope">
               Buy US stocks onchain with AI
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-2">
               {[
                  "Show available stocks",
                  "What's trending today?",
                  "What's declining today?",
                  "Show my portfolio",
                  "Activate AI agent",
               ].map((cmd) => (
                  <button
                     key={cmd}
                     type="button"
                     onClick={() => {
                        onInputChange(cmd);
                     }}
                     className="text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-full transition-all cursor-pointer"
                  >
                     {cmd}
                  </button>
               ))}
            </div>

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
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base font-medium outline-none"
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

            <p className="text-white/60 text-[11px] -mt-4">Available to eligible non-US users only</p>
         </div>
      </div>
   );
}
