"use client";

import {
  SquarePen,
  Search,
  Image,
  Library,
  CalendarClock,
  Puzzle,
  FolderOpen,
  Code2,
  MoreHorizontal,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarNavItem from "./SidebarNavItem";
import SidebarChatItem from "./SidebarChatItem";

const NAV_ITEMS = [
  { icon: SquarePen, label: "New chat" },
  { icon: Image, label: "Images" },
  { icon: Library, label: "Library" },
  { icon: CalendarClock, label: "Scheduled" },
  { icon: Puzzle, label: "Plugins" },
  { icon: FolderOpen, label: "Projects" },
  { icon: Code2, label: "Codex" },
  { icon: MoreHorizontal, label: "More" },
];

const RECENT_CHATS = [
  { id: "1", title: "Branch · X Space Research", active: true },
  { id: "2", title: "Hotel Reservation Confirmation" },
  { id: "3", title: "Base B20 Token Standard" },
  { id: "4", title: "Onchain Summer Buildathon" },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-[260px] shrink-0 h-full bg-[#0d0d0d] border-r border-white/10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-white font-semibold text-base tracking-tight px-1">allign</span>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Search size={16} />
          </button>
          <button className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <SquarePen size={16} />
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="px-2 mt-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.label} icon={item.icon} label={item.label} />
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
            <SidebarChatItem key={chat.id} title={chat.title} active={chat.active} />
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
        <button className="text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors shrink-0 font-medium">
          Upgrade
        </button>
      </div>
    </aside>
  );
}
