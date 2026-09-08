"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import WalletDropdown from "@/components/header/WalletDropdown";

const ROUTE_TITLES: Record<string, string> = {
  "/app":           "Chat",
  "/app/explore":   "Stocks",
  "/app/portfolio": "Portfolio",
  "/app/agent":     "Agent",
  "/app/gift":      "Gift",
};

function usePageTitle() {
  const pathname = usePathname();
  // Exact match first, then check if path starts with a key (for dynamic routes like /app/explore/[ticker])
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const match = Object.keys(ROUTE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key + "/"));
  return match ? ROUTE_TITLES[match] : "";
}

export default function ChatHeader() {
  const title = usePageTitle();

  return (
    <div className="flex items-center justify-between gap-2 px-5 py-3 bg-[#0d0d0d] shrink-0">
      {/* Page title */}
      <span className="text-white font-bold text-lg">{title}</span>

      <div className="flex items-center gap-2">
        {/* Bell pill */}
        <button className="relative flex items-center justify-center bg-[#1c1c1c] rounded-full w-10 h-10 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
          <Bell size={20} className="text-white/70" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>

        {/* Wallet pill */}
        <WalletDropdown />
      </div>
    </div>
  );
}
