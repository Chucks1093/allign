"use client";

import {
  SquarePen,
  Search,
  CalendarClock,
  TrendingUp,
  Gift,
  Briefcase,
} from "lucide-react";
import { Manrope } from "next/font/google";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarNavItem from "./SidebarNavItem";
import SidebarChatItem from "./SidebarChatItem";

const manrope = Manrope({ subsets: ["latin"], weight: ["800"] });

const NAV_ITEMS = [
  { icon: SquarePen, label: "New chat", href: "/" },
  { icon: TrendingUp, label: "Stocks", href: "/explore" },
  { icon: Briefcase, label: "Portfolio", href: "/portfolio" },
  { icon: Gift, label: "Gifts", href: "/gift" },
  { icon: CalendarClock, label: "Scheduled", href: "/scheduled" },
];

const RECENT_CHATS = [
  { id: "1", title: "Branch · X Space Research" },
  { id: "2", title: "Hotel Reservation Confirmation" },
  { id: "3", title: "Base B20 Token Standard" },
  { id: "4", title: "Onchain Summer Buildathon" },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-[260px] shrink-0 h-full bg-[#0d0d0d] border-r border-white/10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className={`${manrope.className} text-white font-extrabold text-base tracking-tight px-1`}>
          ALLIGN
        </span>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <Search size={16} />
          </button>
          <button className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <SquarePen size={16} />
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="px-2 mt-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.label} icon={item.icon} label={item.label} href={item.href} />
        ))}
      </nav>

      <Separator className="my-3 bg-white/10" />

      {/* Recents */}
      <div className="px-3 mb-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recents</p>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5">
          {RECENT_CHATS.map((chat) => (
            <SidebarChatItem key={chat.id} title={chat.title} />
          ))}
        </div>
      </ScrollArea>

      {/* Bottom user */}
      <div className="px-3 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            NG
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate font-medium leading-tight">nice guy</p>
            <p className="text-xs text-white/40">Free</p>
          </div>
        </div>
        <button className="text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors shrink-0 font-medium cursor-pointer">
          Upgrade
        </button>
      </div>
    </aside>
  );
}
