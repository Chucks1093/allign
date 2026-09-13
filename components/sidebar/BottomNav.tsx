"use client";

import { MessageCircle, Globe, Gift, BriefcaseBusiness, Clock5 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { icon: MessageCircle, label: "Chat", href: "/app" },
  { icon: Globe, label: "Stocks", href: "/app/explore" },
  { icon: BriefcaseBusiness, label: "Portfolio", href: "/app/portfolio" },
  { icon: Gift, label: "Gifts", href: "/app/gift" },
  { icon: Clock5, label: "Activity", href: "/app/activity" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-white/10 flex items-center justify-around px-2 py-2">
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? "text-white" : "text-white/40"}`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
