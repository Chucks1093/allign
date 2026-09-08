"use client";

import { SquarePen, TrendingUp, Gift, Briefcase, Bot } from "lucide-react";
import { Manrope } from "next/font/google";
import Link from "next/link";
import SidebarNavItem from "./SidebarNavItem";

const manrope = Manrope({ subsets: ["latin"], weight: ["800"] });

const NAV_ITEMS = [
  { icon: SquarePen, label: "Chat", href: "/app" },
  { icon: TrendingUp, label: "Stocks", href: "/app/explore" },
  { icon: Briefcase, label: "Portfolio", href: "/app/portfolio" },
  { icon: Gift, label: "Gifts", href: "/app/gift" },
  { icon: Bot, label: "Trade Activity", href: "/app/agent" },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-[220px] shrink-0 h-full bg-[#0d0d0d] border-r border-white/10">
      <div className="flex items-center px-3 pt-4 pb-2">
        <span className={`${manrope.className} text-white font-extrabold text-base tracking-tight px-1`}>
          ALLIGN
        </span>
      </div>

      <nav className="px-2 mt-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.label} icon={item.icon} label={item.label} href={item.href} />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="px-3 py-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-center py-5 bg-white/[0.03]">
            <img src="/icons/gift.svg" alt="Gift" width={40} height={40} />
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs text-white/50 leading-relaxed text-center">
              Gift US stocks to anyone, instantly onchain.
            </p>
            <Link href="/app/gift" className="w-full flex items-center justify-center text-xs font-semibold bg-[#a8ff78] hover:bg-[#96f060] text-black py-2 rounded-xl transition-colors">
              Gift a Stock
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
